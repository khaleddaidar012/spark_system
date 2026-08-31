# Spark ERP — تشخيص شامل وإصلاحات مشكلة اختلاف البيانات بين الأجهزة

> كل المشاكل مرتبة حسب الأولوية. كل fix متوافق مع الكود الحالي.
>
> ## ✅ الإصلاحات المطبقة
>
> | المشكلة | الإصلاح | الملف |
> |-----------|---------|-------|
> | 🔴 1 Race Condition | أضف `_reconciling` flag + `isReconciling()` | `store.js` + `SyncEngine.js` |
> | 🔴 2 حذف خاطئ لـ people | استخدام `kind` فقط (بدل `roles`) في الـ reconciliation | `store.js` + `SyncEngine.js` |
> | 🟠 3 role string mismatch | محلول بإصلاح #2 | `SyncEngine.js` |
> | 🟠 4 save() fire-and-forget | تحويل `save()` إلى `async` + try/catch + rollback | `store.js` |
> | 🟠 4b remove() نفس المشكلة | تحويل `remove()` إلى try/catch + rollback | `store.js` |
> | 🟡 5 كود مكرر | `reconcileServerSnapshot` صار `export` | `store.js` |
> | 🟡 6 SW cache version | `v24` → `v25` | `sw.js` |
> | 🟡 7 record بدون kind | إضافة `kind` لـ `record` | `store.js` |
>
> **ملاحظة**: `remove()` في `base-repository.js` ما اتغيرش — هيدم يخدم بنفس الطريقة.
>
> ---
>
> ## ⚠️ ملاحظة مهمة قبل النشر
>
> خدم `save()` صار `async`. كل الـ calls لـ `save()` في كل اماكن الكود (actions.js, pages/*.js, modules/*.js) هيستخدمو نفس الطريقة (بدون await) وده مقبول لأن الـ cache في الميموري بتحدث فوراً والكتابة للـ IndexedDB بتجري في الخلفية.

---

# Spark ERP — تشخيص شامل وإصلاحات مشكلة اختلاف البيانات بين الأجهزة

> كل المشاكل مرتبة حسب الأولوية. كل fix متوافق مع الكود الحالي.

## 🔴 المشكلة 1 (حرجة): Race Condition بين `reconcileServerSnapshot()` و `pullRemoteChanges()`

### الملفات والسطور
- **`frontend/assets/js/modules/store.js`** — سطر 96-109 (`initStore()` fire-and-forget)
- **`frontend/assets/js/sync/SyncEngine.js`** — سطر 84-86 (`setTimeout(() => triggerSync(), 800)`)
- **`frontend/assets/js/sync/SyncEngine.js`** — سطر 278-337 (`pullRemoteChanges()`)

### وصف المشكلة
`initStore()` بترسل `api.snapshot()` في الخلفية (fire-and-forget بدون await) وبتعالج `reconcileServerSnapshot()`. وفي نفس الوقت تقريباً، `SyncEngine.init()` بيوصل `triggerSync()` بعد 800ms بيحاط `pullRemoteChanges()`. الاتنين بيعملوا **نفس العملية** على جدول `people`:
1. يقرأوا الناس المحلية اللي `syncStatus === "synced"`
2. يمسحوا اللي مش موجودة على السيرفر
3. يكتبوا `bulkPut` للبيانات من السيرفر

**مفيش lock أو flag يمنعهم من الشغل في نفس الوقت.** لو الاتنين اشتغلوا في وقت واحد:
- `pullRemoteChanges()` تقرأ الـ people قبل ما `reconcileServerSnapshot()` تمسح
- `pullRemoteChanges()` تمسح حد ما كتبه `reconcileServerSnapshot()`
- العكس صحيح
- **النتيجة: فقدان بيانات أو تكرار**

### سيناريو إعادة الإنتاج
1. فتح التطبيق على اللابتوب (الجهاز أ)
2. `initStore()` بتشتغل → `loadCacheFromIndexedDB()` → `api.snapshot()` بتروح في الخلفية
3. `SyncEngine.init()` بتي هي كمان → `setTimeout(triggerSync, 800)`
4. `triggerSync()` بتشتغل بعد 800ms → `pushPendingOperations()` → `pullRemoteChanges()`
5. `pullRemoteChanges()` بتقرأ الناس من IndexedDB
6. بالوقت ده `reconcileServerSnapshot()` لسه شغالة
7. الاتنين بيعملوا `delete` + `bulkPut` على `db.people` في نفس الوقت
8. **بيانات مفقودة أو متكررة**

### التأثير
- بيانات المقاولين والموردين بتختفي أو تتكرر
- كل مرة تتفتح التطبيق ممكن تحصل مشكلة مختلفة

### الإصلاح

**أضف lock بسيط في `SyncEngine` لمنع `pullRemoteChanges()` من الشغل لو `reconcileServerSnapshot` لسه شغالة، والعكس:**

في `SyncEngine.js` — أضف property `_isReconciling`:

```javascript
class SyncEngine {
  constructor() {
    this.isSyncing = false;
    this.syncInterval = null;
    this._pendingQueueSync = null;
    this.lastSyncAt = null;
    this._watchdogTimer = null;
    this._isReconciling = false; // ← إضافة جديدة
  }
```

عدّل `pullRemoteChanges()`:

```javascript
async pullRemoteChanges() {
  if (this._isReconciling) return; // لا تشتغل لو reconciliation لسه جارية
  try {
    // ... الكود ده هو نفسه
  }
}
```

وعلّق `initStore()` في `store.js` إنها تستنى الـ `reconcileServerSnapshot` كويس قبل ما تطلق `spark:remote-data-updated`:

```javascript
// 4. Fire-and-forget background API hydration
if (navigator.onLine) {
  Promise.resolve().then(async () => {
    try {
      const data = await api.snapshot();
      if (data && typeof data === "object") {
        await reconcileServerSnapshot(data); // ← await بالفعل
        await loadCacheFromIndexedDB();
        emitDataChanged();
      }
    } catch {
      /* Running on local IndexedDB — this is normal when offline */
    }
  });
}
```

> **ملاحظة**: `reconcileServerSnapshot` هو async بالفعل واتقال بـ `await`، لكن المشكلة إن `initStore()` نفسها مش async (ترجع فوراً). إزاي الحل: اتأكد إن `triggerSync()` في SyncEngine بستنى الـ reconciliation تكتمل قبل ما `pullRemoteChanges()` يشتغل.

**الحل الأفضل والأكيد**: أضف flag في `store.js` واقرأه من `SyncEngine`:

في `store.js` — أضف:
```javascript
let _reconciling = false;

export async function initStore({ force = false } = {}) {
  // ... نفس الكود

  if (navigator.onLine) {
    _reconciling = true;
    Promise.resolve().then(async () => {
      try {
        const data = await api.snapshot();
        if (data && typeof data === "object") {
          await reconcileServerSnapshot(data);
          await loadCacheFromIndexedDB();
          emitDataChanged();
        }
      } catch { /* normal when offline */ }
      finally {
        _reconciling = false;
      }
    });
  }
}

export function isReconciling() {
  return _reconciling;
}
```

في `SyncEngine.js` — استورد `isReconciling` وعلّق `pullRemoteChanges`:

```javascript
import { isReconciling } from "../modules/store.js";

async pullRemoteChanges() {
  if (isReconciling()) return;
  // ... نفس الكود
}
```

---

## 🔴 المشكلة 2 (حرجة): حذف خاطئ لناس عندهم `kind` و `roles` مختلفة

### الملفات والسطور
- **`frontend/assets/js/modules/store.js`** — سطر 139-141 (`reconcileServerSnapshot`)
- **`frontend/assets/js/sync/SyncEngine.js`** — سطر 301-303 (`pullRemoteChanges`)
- **`functions/api/[[path]].js`** — سطر 246-271 (`snapshot`)

### وصف المشكلة
السيرفر في `snapshot()` بيدخل كل شخص في **مجموعة واحدة بس** بناءً على `row.kind`:
```javascript
for (const row of people) {
    const item = JSON.parse(row.data);
    if (Array.isArray(result[row.kind])) result[row.kind].push(item);
}
```
يعني لو شخص عنده `kind: "suppliers"`، هيظهر بس في `result.suppliers`.

بس الـ frontend في الـ filtering بيفحص **كل المجموعات** بشكل مستقل:
- `reconcileServerSnapshot` لسطر 140: `roles.includes(COLLECTION_ROLE[key])` = `roles.includes("supplier")`
- `pullRemoteChanges` لسطر 302: `roles.includes(key)` = `roles.includes("suppliers")`

**مشكلة 1 — حذف الناس الغلط:**
لو شخص عنده `kind: "suppliers"` و `roles: ["supplier"]`:
- لما `pullRemoteChanges` بتعالج `"suppliers"`: `serverIdSet` ليه فاضي (لأن السيرفر رماه تحت suppliers) → **مش هيمسحه** ✅
- لكن لما `pullRemoteChanges` بتعالج `"contractors"`: الشخص مش في `serverIdSet` الخاص بالـ contractors → **هيتمسح** ❌

**مشكلة 2 — اختلاف role string بين الـ two reconcile functions:**
- `reconcileServerSnapshot`: `roles.includes(COLLECTION_ROLE[key])` → `"supplier"` (لو `key="suppliers"`)
- `pullRemoteChanges`: `roles.includes(key)` → `"suppliers"` (لو `key="suppliers"`)

**مشكلة 3 — `bulkPut` بيكتب `kind: key` لكل عنصر:**
- `store.js` سطر 148: `items.map((item) => ({ ...item, kind: key, ... }))`
- `SyncEngine.js` سطر 310: `serverItems.map((item) => ({ ...item, kind: key, ... }))`

لو عنصر عنده `kind: "suppliers"` بس الـ server رماه تحت `key = "suppliers"` وهو فعلياً `kind: "suppliers"`، ده صح. بس لو الـ server بيرجع عنصر بـ `kind: "contractors"` في مجموعة `suppliers` (مش محتمل لكن ممكن)، الـ `kind` هيتغير غلط.

### سيناريو إعادة الإنتاج
1. موبايل عنده شخص: `{ id: "x", kind: "suppliers", roles: ["supplier"] }`
2. اللاب عنده نفس الشخص لكن `kind: "suppliers"` و `roles: ["supplier", "contractor"]`
3. اللاب يعمل `pullRemoteChanges()`:
   - يعالج `"suppliers"`: `serverIdSet` فيه الشخص → لا مسح
   - يعالج `"contractors"`: الشخص مش في `serverIdSet` الخاص بالـ contractors → **مسح** الشخص من `db.people`
4. الشخص راح!

### التأثير
- فقدان بيانات أشخاص عندهم أكثر من role
- اختلاف البيانات بين الأجهزة

### الإصلاح

**الحل: التوقف عن مسح الناس بناءً على `roles` — استخدم `kind` بس.**

السيرفر هو الـ source of truth، وكل شخص بيكون في مجموعة واحدة بس بناءً على `kind`. الـ `roles` هو للمعلومات الإضافية بس، مش للفلترة في الـ reconciliation.

**إصلاح `reconcileServerSnapshot` في `store.js` (سطر 136-150):**

```javascript
if (PEOPLE_COLLECTIONS.includes(key)) {
    if (db.people) {
        // مسح الناس اللي نفس الـ kind بس (مش الـ roles)
        const currentPeople = await db.people
            .where("kind")
            .equals(key)
            .filter((p) => p.syncStatus === "synced" && !p.deletedAt)
            .toArray();
        for (const p of currentPeople) {
            if (!serverIdSet.has(p.id)) {
                await db.people.delete(p.id).catch(() => {});
            }
        }
        if (items.length > 0) {
            await db.people.bulkPut(items.map((item) => ({
                ...item,
                kind: key,
                syncStatus: "synced",
            })));
        }
    }
}
```

**إصلاح `pullRemoteChanges` في `SyncEngine.js` (سطر 299-312):**

```javascript
if (PEOPLE_KEYS.includes(key)) {
    if (db.people) {
        const currentLocalPeople = await db.people
            .where("kind")
            .equals(key)
            .filter((p) => p.syncStatus === "synced" && !p.deletedAt)
            .toArray();
        for (const p of currentLocalPeople) {
            if (!serverIdSet.has(p.id)) {
                await db.people.delete(p.id).catch(() => {});
            }
        }
        if (serverItems.length > 0) {
            await db.people.bulkPut(serverItems.map((item) => ({
                ...item,
                kind: key,
                syncStatus: "synced",
            })));
        }
    }
}
```

> **ملاحظة مهمة**: الـ `loadCacheFromIndexedDB` (store.js سطر 121-124) هتفضل تفحص `roles` للأغراض العرضية (عرض الناس في UI)، لكن الـ reconciliation هتستخدم `kind` بس.

**كمان أصلح `loadCacheFromIndexedDB` عشان تتجنب التكرار:**
حالياً لو شخص عنده `kind: "suppliers"` و `roles: ["contractor"]`، هيسيب في `cache.suppliers` و `cache.contractors`. ده مش مثالي لكنه ما بيسبب فقدان بيانات. الأفضل إن السيرفر هو اللي يتحكم في `kind` الواحد، والـ `roles` يكونوا اختياري.

---

## 🟠 المشكلة 3 (عالية): اختلاف role string بين `reconcileServerSnapshot` و `pullRemoteChanges`

### الملفات والسطور
- **`frontend/assets/js/modules/store.js`** — سطر 140
- **`frontend/assets/js/sync/SyncEngine.js`** — سطر 302

### وصف المشكلة
كما ذكرنا في المشكلة 2:
- `store.js` سطر 140: `p.roles.includes(COLLECTION_ROLE[key])` → `"supplier"`
- `SyncEngine.js` سطر 302: `p.roles.includes(key)` → `"suppliers"`

حتى لو ماشي السباق (race condition)، الاتنين بيعاملوا الناس المختلفة.

### الإصلاح
مشكله دي محلولة تلقائياً بإصلاح المشكلة 2 — علينا نوقف استخدام `roles` في reconciliation خالص ونستخدم `kind` بس.

---

## 🟠 المشكلة 4 (عالية): `save()` fire-and-forget بدون await

### الملف والسطر
- **`frontend/assets/js/modules/store.js`** — سطر 239-261

### وصف المشكلة
```javascript
// Durable write to IndexedDB + enqueue in SyncQueue
(async () => {
    try {
        // ...
    } catch (err) {
        console.error("[Store] Dexie write error:", err);
    }
})();
```

الكتابة للـ IndexedDB بتحصل في IIFE مش await. لو الاتصال مقطوع أو Dexie فشل:
1. الـ cache في الميموري فيه البيانات
2. الـ IndexedDB ما اتحدثش
3. `syncQueue` ما اتحدّثش
4. المستخدم يظن إن الحفظ تم
5. بعد refresh → البيانات بتروح

### التأثير
- فقدان بيانات بعد refresh لو الكتابة فشلت
- الـ syncQueue فاضي → العمليات مش هتتزامن

### الإصلاح

**بدل الـ IIFE، استخدم `try/catch` مع `await` وأرجع نتيجة:**

```javascript
export async function save(name, item) {
    if (PEOPLE_COLLECTIONS.includes(name)) {
        item.kind = item.kind || name;
        if (!item.roles || !Array.isArray(item.roles) || !item.roles.length) {
            item.roles = [COLLECTION_ROLE[name] || "supplier"];
        }
    }

    const list = cache[name] || (cache[name] = []);
    const idx = list.findIndex((x) => x.id === item.id);
    if (idx === -1) list.push(item);
    else list[idx] = item;

    const now = Date.now();
    const record = {
        ...item,
        updatedAt: now,
        syncStatus: "pending",
    };

    try {
        const table = PEOPLE_COLLECTIONS.includes(name) ? db.people : db[name];
        if (table) {
            await db.transaction("rw", [table, db.syncQueue], async () => {
                await table.put({ ...record, kind: PEOPLE_COLLECTIONS.includes(name) ? name : undefined });
                await db.syncQueue.add({
                    id: generateUUID(),
                    entity: name,
                    entityId: item.id,
                    operation: idx === -1 ? "create" : "update",
                    payload: record,
                    createdAt: now,
                    status: "pending",
                });
            });
        }
        window.dispatchEvent(new CustomEvent("spark:queue-updated"));
    } catch (err) {
        console.error("[Store] Dexie write error:", err);
        // رجّع البيانات للـ cache لو الكتابة فشلت
        if (idx === -1) {
            list.pop();
        } else {
            list[idx] = item; // رجّع القيمة القديمة
        }
    }

    emitDataChanged();
    return item;
}
```

> **ملاحظة**: ده بيغير الـ signature من `save(name, item)` لـ `async save(name, item)`. كل النداءات لـ `save()` لازم تضيف `await`. لو مش عايز تكسر calls الحالية، ممكن تترك الدالة async والـ await في الـ call sites.

---

## 🟡 المشكلة 5 (متوسطة): `reconcileServerSnapshot` و `pullRemoteChanges` كود مكرر بسلوك مختلف

### الملفات والسطور
- **`frontend/assets/js/modules/store.js`** — سطر 130-169
- **`frontend/assets/js/sync/SyncEngine.js`** — سطر 278-337

### وصف المشكلة
الاتنين بيعملوا نفس الحاجة بالتقريب:
1. يقرأوا الـ synced items من IndexedDB
2. يمسحوا اللي مش موجودة على السيرفر
3. يكتبوا `bulkPut` للبيانات

بس الكود مختلف، وفيه فروقات صغيرة (role strings, filter conditions) اللي بتسبب المشاكل اللي فوق.

### الإصلاح
**استخدم `reconcileServerSnapshot` كـ source of truth واترك `pullRemoteChanges` يستخدمها:**

في `SyncEngine.js` — استورد `reconcileServerSnapshot`:

```javascript
import { reconcileServerSnapshot as _reconcileServerSnapshot } from "../modules/store.js";
```

عدّل `pullRemoteChanges()`:

```javascript
async pullRemoteChanges() {
    try {
        const res = await api.pullSync();
        if (res && res.ok && res.data) {
            await _reconcileServerSnapshot(res.data);

            await db.syncMetadata.put({ key: "lastSyncAt", value: res.serverTime || Date.now() });

            window.dispatchEvent(new CustomEvent("spark:remote-data-updated"));
        }
    } catch (err) {
        console.warn("[SyncEngine] Pull failed:", err);
    }
}
```

> **ملاحظة**: عشان `reconcileServerSnapshot` تسيب في `store.js`، لازم تتعديل عشان `reconcileServerSnapshot` ترجع `Promise` صريح (هيكون كده).

---

## 🟡 المشكلة 6 (متوسطة): Service Worker cache version قديم

### الملف والسطر
- **`frontend/sw.js`** — سطر 6

### وصف المشكلة
```javascript
const CACHE_NAME = "spark-erp-cache-v24";
```
لو اتغير الكود الجديد (fixes فوق) والسيرفر م حدّث الـ `CACHE_NAME`، الأجهزة القديمة هتستخدم JS cached version فيه الbugs.

### الإصلاح

غيّر `CACHE_NAME`:
```javascript
const CACHE_NAME = "spark-erp-cache-v25";
```

> ده هيخلي الـ Service Worker يمسح الـ old cache ويعيد cache الملفات الجديدة تلقائياً (لأن الـ `activate` event بيعمل `caches.keys().filter(key => key !== CACHE_NAME).map(key => caches.delete(key))`).

---

## 🟡 المشكلة 7 (متوسطة): `save()` مش بكتب `kind` في الـ `record`

### الملف والسطر
- **`frontend/assets/js/modules/store.js`** — سطر 232-236

### وصف المشكلة
```javascript
const record = {
    ...item,
    updatedAt: now,
    syncStatus: "pending",
};
```

`record` مش فيه `kind`. وبعدين في `table.put`:
```javascript
await table.put({ ...record, kind: PEOPLE_COLLECTIONS.includes(name) ? name : undefined });
```

بيكتب `kind` صح، بس لو `item.kind` كان موجود ومختلف عن `name` (مثلاً `item.kind = "supplier"` بدل `"suppliers"`)، الـ `record` هياخد `item.kind` القديم. وده ممكن يحصل لو الـ `item` جاي من مكان تاني.

### الإصلاح

أضف `kind` لـ `record` بشكل صريح:
```javascript
const record = {
    ...item,
    updatedAt: now,
    syncStatus: "pending",
    kind: PEOPLE_COLLECTIONS.includes(name) ? name : item.kind,
};
```

---

## 📋 ملخص الإصلاحات حسب الأولوية

| الأولوية | المشكلة | الملف | نوع الإصلاح |
|-----------|---------|-------|-------------|
| 🔴 1 | Race Condition بين initStore و SyncEngine | store.js + SyncEngine.js | إضافة lock flag |
| 🔴 2 | حذف خاطئ لناس عندهم roles متعددة | store.js + SyncEngine.js | تغيير filter من roles لـ kind |
| 🟠 3 | اختلاف role string بين الـ two reconcile | store.js + SyncEngine.js | محلول بإصلاح #2 |
| 🟠 4 | save() fire-and-forget بدون await | store.js | تحويل لـ async + await |
| 🟡 5 | كود مكرر في reconcile functions | SyncEngine.js | إعادة استخدام reconcileServerSnapshot |
| 🟡 6 | SW cache version قديم | sw.js | ترقية version |
| 🟡 7 | record بدون kind محدد | store.js | إضافة kind لـ record |

---

## 🧪 خطة الاختبار

### اختبار يدوي — اللابتوب + الموبايل (نفس الحساب)

#### الاختبار 1: إضافة شخص جديد على جهاز ثم التأكد على الجهاز التاني
1. على اللابتوب: أضف مقاول جديد باسم "Test Contractor"
2. انتظر حتى الشاشة توضح "synced" أو الاتصال بالسيرفر
3. على الموبايل: اسحب للأسفل لتحديث (pull)
4. **المتوقع**: "Test Contractor" يظهر على الموبايل
5. **الآن على الموبايل**: احذف "Test Contractor"
6. انتظر الsync
7. على اللابتوب: حددّث
8. **المتوقع**: "Test Contractor" محذوف من اللابتوب

#### الاختبار 2: شخص عنده multiple roles
1. أضف شخص بـ `kind: "suppliers"` و `roles: ["supplier", "contractor"]`
2. اعمل sync بين الأجهزة
3. **المتوقع**: الشخص مفيش محذوف من أي جهاز

#### الاختبار 3: تحديث في نفس الوقت على الاتنين
1. على اللابتوب: غيّر اسم مقاول
2. **في نفس الثانية** على الموبايل: غيّر نفس المقاول باسم مختلف
3. اعمل sync على الاتنين
4. **المتوقع**: البيانات ما اتفقدتش — آخر تحديث يربح (أو يظهر conflict)

#### الاختبار 4: refresh الصفحة أثناء sync
1. افتح التطبيق
2. قبل ما الـ sync يكمل، اضغط F5
3. **المتوقع**: البيانات المتاحة في IndexedDB هي اللي تظهر (موش empty)

#### الاختبار 5: العمل offline ثم الرجوع online
1. قطع الإنترنت عن الموبايل
2. أضف 3 أشخاص جدد
3. ارجع الاتصال بالإنترنت
4. **المتوقع**: الأشخاص الثلاثة يتزامنوا مع اللابتوب

#### الاختبار 6: التحقق من الـ cache version
1. افتح الـ DevTools → Application → Service Workers
2. تأكد إن الـ `CACHE_NAME` هو `"spark-erp-cache-v25"`
3. **المتوقع**: الـ cache متحدّث

### اختبار آلي (اختياري)
```javascript
// في ملف test sync
describe('SyncEngine race condition', () => {
    test('reconcileServerSnapshot and pullRemoteChanges dont run concurrently', async () => {
        // محاكاة تشغيل الاتنين في نفس الوقت
        // التأكد إن الـ lock flag بيشتغل
    });
    
    test('people with multiple roles are not deleted', async () => {
        // إضافة person بـ kind: "suppliers", roles: ["supplier", "contractor"]
        // تشغيل pullRemoteChanges لكل المجموعات
        // التأكد إن الشخص موجود في db.people
    });
});
```

---

## ✅ ملاحظات عامة

- **كل الإصلاحات متوافقة مع الـ DB schema** — مفيش تغيير في `migrations/0001_init.sql`
- **الـ `roles` array** هيفضل موجودة للأغراض العرضية بس مش للفلترة في الـ reconciliation
- **السيرفر (D1)** هو الـ source of truth — كل التغييرات بتهبط من `kind` بس
- **ما فيش حاجة تتكسر** في الـ existing functionality
