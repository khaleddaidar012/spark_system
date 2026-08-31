# 🔧 Spark ERP — تشخيص وحل مشكلة المزامنة بين الأجهزة

## 📋 ملخص المشكلة
البيانات على اللاب **مختلفة** عن البيانات على التلفون.
أي إضافة على التلفون (مشروع، مورد، معاملة مالية) **لا تظهر على اللاب والعكس**.
النظام يقول "تمت المزامنة" لكن البيانات لا تتزامن فعلاً.

---

## 🔍 تشخيص المشاكل الجذرية

### 🔴 مشكلة #1 — `pullRemoteChanges` لا يستبدل البيانات المحلية الجديدة (الأكبر)

**الموقع:** `SyncEngine.js` → دالة `pullRemoteChanges()` (السطر 313-391)

**المشكلة:**
```js
// الكود الحالي — شرط خاطئ
if (localItem && localItem.syncStatus === "pending" && localItem.updatedAt >= serverItem.updatedAt) {
  return { ...localItem, syncStatus: "synced", deletedAt: null }; // ✅ محلي أحدث
}
// أي آيتم ليس "pending" يُستبدل بالسيرفر ✅
```

**المشكلة الحقيقية:** عندما يعمل الجهاز A مزامنة ويضيف بيانات على السيرفر، ثم يفتح الجهاز B ويعمل `pull` — الجهاز B يجلب البيانات بشكل صحيح ويحطها في IndexedDB. **لكن** `loadCacheFromIndexedDB()` في `store.js` يُستدعى فقط عند حدث `spark:remote-data-updated`.

**الخلل:** الحدث `spark:remote-data-updated` يُطلَق في `pullRemoteChanges()` → لكن في `initStore()` الـ listener مسجل مرة واحدة عند البداية. لو السيرفر ما رجع بيانات جديدة (`serverItems.length === 0`) أو لو الـ `bulkPut` أخطأ — الحدث ما بيتطلق والـ UI ما بيتحدث.

---

### 🔴 مشكلة #2 — `snapshot()` في السيرفر لا يرجع `deletedAt` وهذا يسبب إشكالية

**الموقع:** `functions/api/[[path]].js` → دالة `snapshot()` (السطر 246-271)

**المشكلة:**
```js
// السيرفر يقرأ data JSON لكن...
projects: projects.map((r) => JSON.parse(r.data)),
```

عند `upsertItem` → السيرفر يحفظ الـ `data` كـ JSON مكتمل. **لكن** `cleanPayloadForServer` في `SyncEngine.js` يحذف `deletedAt` و `syncStatus` قبل الإرسال:

```js
function cleanPayloadForServer(payload) {
  delete cleaned.syncStatus;
  delete cleaned.deletedAt; // ← هنا المشكلة!
  return cleaned;
}
```

**النتيجة:** عندما يحذف المستخدم عنصر → الحذف يُرسل كـ `operation: "delete"` عبر syncQueue ✅. لكن لو الجهاز الآخر يقرأ الـ snapshot بعد الحذف — الـ pull يشوف العنصر مش موجود على السيرفر ويحذفه محلياً **فقط إذا كان syncStatus === "synced"**. لو كان pending → لن يُحذف.

---

### 🔴 مشكلة #3 — `pushPendingOperations` لا يُكمل إذا فشل batch واحد

**الموقع:** `SyncEngine.js` → `pushPendingOperations()` (السطر 244-311)

**المشكلة:**
```js
} else {
  console.warn("[SyncEngine] Push returned non-OK:", res);
  break; // ← يوقف كل المزامنة إذا batch واحد فشل!
}
```

لو رجع السيرفر خطأ على batch واحد → تتوقف المزامنة كلها ويبقى باقي العمليات معلقة إلى الأبد تقريباً.

---

### 🔴 مشكلة #4 — `seedDefaultData` يُعيد seed البيانات عند كل pull جديد (إذا حُذفت)

**الموقع:** `store.js` → `seedDefaultData()` (السطر 413-448)

**المشكلة:**
```js
if (!localStorage.getItem("spark_contractors_deleted")) {
  // يضيف contractors الافتراضيين كل مرة إذا ما في flag
}
```

هذا الكود يضيف البيانات الافتراضية بـ ID ثابت (`seed_c_...`) في كل جهاز. لكن لو المستخدم حذف مقاول من التلفون ثم عمل sync — الجهاز الآخر (اللاب) سيُعيد إضافته مجدداً من `seedDefaultData` عند كل `initStore({ force: true })`.

---

### 🔴 مشكلة #5 — `ConnectivityMonitor` يراقب `/api/health` بـ interval ثابت (لا SSE)

**الموقع:** `ConnectivityMonitor.js`

**المشكلة:** النظام الحالي يعمل **polling** كل 60 ثانية. يعني لو أضفت بيانات على التلفون، اللاب **مش هيشوفها** إلا بعد 60 ثانية في أحسن الأحوال، أو عند focus على الـ tab.

**الحل الصح:** استخدام **Server-Sent Events (SSE)** أو **periodic pull بـ interval أقصر** مع مقارنة timestamp.

---

### 🟡 مشكلة #6 — `pullRemoteChanges` لا يستخدم `lastSyncAt` (Full Snapshot كل مرة)

**الموقع:** `SyncEngine.js` → `pullRemoteChanges()` + `functions/api/[[path]].js`

**المشكلة:** كل مرة يعمل `pull`، يجلب كل البيانات من السيرفر بالكامل (Full Snapshot). هذا بطيء ومرهق، ولا يوجد `?since=lastSyncAt` على السيرفر.

---

### 🟡 مشكلة #7 — Race Condition في `triggerSync()`

**الموقع:** `SyncEngine.js` → `triggerSync()` (السطر 113)

**المشكلة:** `isSyncing` flag يمنع sync متزامن، لكن لو فشل sync وـ `isSyncing` ظل `true` (بسبب exception غير متوقع قبل `finally`) — النظام سيتجمد. الـ Watchdog يحلها لكن بعد 25 ثانية.

---

### 🟡 مشكلة #8 — `wipeAll()` يستدعي `api.reset()` (يمسح السيرفر!)

**الموقع:** `store.js` → `wipeAll()` (السطر 315-330)

**المشكلة:**
```js
if (navigator.onLine) await api.reset().catch(() => {});
```

هذا يمسح **كل البيانات من D1** على الكلاود! مزامنة مع جهاز آخر بعد عمل reset ستُفقد كل بياناته.

---

## 🛠️ خطة الإصلاح (مرتبة بالأولوية)

---

### ✅ إصلاح #1 — إضافة `?since=` للـ pull API + تحديث السيرفر

**الهدف:** بدل ما نجيب كل البيانات كل مرة، نجيب فقط البيانات المعدلة منذ آخر sync.

**التعديل في `functions/api/[[path]].js`:**

```js
// قبل — يرجع كل شيء
if (segments[1] === "pull" && method === "GET") {
  const data = await snapshot(env.DB);
  return json({ ok: true, serverTime: Date.now(), data });
}

// بعد — يدعم ?since=timestamp
if (segments[1] === "pull" && method === "GET") {
  const since = Number(url.searchParams.get("since")) || 0;
  const data = since > 0 
    ? await snapshotSince(env.DB, since)  // دالة جديدة
    : await snapshot(env.DB);
  return json({ ok: true, serverTime: Date.now(), data });
}
```

> **ملاحظة:** هذا يتطلب إضافة حقل `updated_at` لجداول D1 ومقارنته. لأن الـ schema الحالي يخزن البيانات كـ JSON في حقل `data` فقط.

---

### ✅ إصلاح #2 — تحديث `pullRemoteChanges` ليضمن تحديث الـ UI دائماً

**الموقع:** `SyncEngine.js`

**التعديل:**
```js
async pullRemoteChanges() {
  try {
    // أرسل lastSyncAt للسيرفر
    const since = this.lastSyncAt || 0;
    const res = await api.pullSync(since); // ← أضف parameter
    
    if (res && res.ok && res.data) {
      // ... كود الـ merge الحالي ...
      
      await db.syncMetadata.put({ key: "lastSyncAt", value: res.serverTime || Date.now() });
      
      // ✅ دائماً أطلق الحدث لتحديث الـ UI حتى لو ما في تغييرات
      window.dispatchEvent(new CustomEvent("spark:remote-data-updated"));
    }
  } catch (err) {
    console.warn("[SyncEngine] Pull failed:", err);
  }
}
```

وتحديث `api.pullSync`:
```js
// في api.js
pullSync: (since = 0) => request(`/sync/pull${since > 0 ? `?since=${since}` : ""}`)
```

---

### ✅ إصلاح #3 — إصلاح `pushPendingOperations` لا يتوقف عند فشل batch

**الموقع:** `SyncEngine.js`

```js
// قبل — يوقف كل شيء
} else {
  console.warn("[SyncEngine] Push returned non-OK:", res);
  break; // ← مشكلة
}

// بعد — يتخطى الـ batch الفاشل ويكمل
} else {
  console.warn("[SyncEngine] Push returned non-OK:", res);
  // Mark current batch as failed but continue
  for (const op of pendingOps) {
    await SyncQueueManager.markFailed(op.autoId, "server-rejected");
  }
  break; // لا يزال يوقف لكن بعد تسجيل الخطأ
}
```

---

### ✅ إصلاح #4 — تقليل interval الـ pull إلى 30 ثانية + Polling أذكى

**الموقع:** `SyncEngine.js` → `init()`

```js
// قبل — 60 ثانية
this.syncInterval = setInterval(() => {
  if (connectivityMonitor.isServerReachable && !this.isSyncing) {
    this.triggerSync();
  }
}, 60000);

// بعد — 30 ثانية مع Smart Pull (pull فقط إذا تجاوزنا 30 ثانية)
this.syncInterval = setInterval(() => {
  if (connectivityMonitor.isServerReachable && !this.isSyncing) {
    const timeSinceLastSync = Date.now() - (this.lastSyncAt || 0);
    if (timeSinceLastSync > 25000) { // 25 ثانية minimum
      this.triggerSync();
    }
  }
}, 30000);
```

---

### ✅ إصلاح #5 — إضافة SSE أو BroadcastChannel للإشعار الفوري

**الهدف:** بدل polling، استخدام **BroadcastChannel API** (يعمل بين tabs في نفس المتصفح) + polling للأجهزة المختلفة.

> للأجهزة المختلفة: نضيف **SSE endpoint** على السيرفر (Cloudflare Workers Streaming).

**Server-Sent Events في `functions/api/[[path]].js`:**

```js
// endpoint جديد: GET /api/sync/events
if (segments[1] === "events" && method === "GET") {
  const user = await requireAuth(request, env);
  if (!user) return unauthorized();
  
  // SSE Stream
  const { readable, writable } = new TransformStream();
  const writer = writable.getWriter();
  const encoder = new TextEncoder();
  
  // أرسل lastServerTime الحالي فوراً
  const currentTime = Date.now();
  writer.write(encoder.encode(`data: ${JSON.stringify({ type: "connected", serverTime: currentTime })}\n\n`));
  
  return new Response(readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    }
  });
}
```

> **تنبيه:** Cloudflare Workers لا تدعم SSE connections طويلة الأمد. البديل الأفضل هو **polling ذكي بـ 15-30 ثانية** مع مقارنة `serverTime`.

---

### ✅ إصلاح #6 — إصلاح `seedDefaultData` لمنع إعادة الإضافة بعد الحذف

**الموقع:** `store.js`

**المشكلة الحالية:**
- Flag `spark_contractors_deleted` موجود فقط في localStorage جهاز واحد
- الجهاز الثاني ما عنده الـ flag → يُعيد إضافة البيانات الافتراضية

**الحل:** حفظ الـ flag في IndexedDB (syncable) بدل localStorage:

```js
// قبل
if (!localStorage.getItem("spark_contractors_deleted")) {

// بعد — نتحقق من وجود أي contractors في DB (إذا في بيانات = ما نعمل seed)
export async function seedDefaultData() {
  const contractorCount = await db.people
    .where("kind").equals("contractors")
    .count();
  
  if (contractorCount === 0 && !localStorage.getItem("spark_seed_done_v2")) {
    // seed فقط إذا ما في contractors أصلاً
    // ...
    localStorage.setItem("spark_seed_done_v2", "1");
  }
}
```

**أفضل حل:** لا تعمل seed في `store.js` أصلاً — اتركها للسيرفر فقط عبر `/api/data/seed`.

---

### ✅ إصلاح #7 — حماية `wipeAll()` من مسح بيانات السيرفر تلقائياً

**الموقع:** `store.js` → `wipeAll()`

```js
// قبل — خطير!
if (navigator.onLine) await api.reset().catch(() => {});

// بعد — لا نمسح السيرفر تلقائياً أبداً
export async function wipeAll() {
  try {
    await db.transaction("rw", [...], async () => {
      // امسح IndexedDB المحلي فقط
    });
  } catch {}
  for (const key of Object.keys(cache)) cache[key] = [];
  // ❌ لا نستدعي api.reset() هنا أبداً
}
```

---

### ✅ إصلاح #8 — إضافة `updated_at` في D1 لدعم Incremental Pull

**الموقع:** `functions/api/[[path]].js` + migrations

```sql
-- إضافة حقل updated_at لجميع الجداول
ALTER TABLE projects ADD COLUMN updated_at INTEGER DEFAULT 0;
ALTER TABLE people ADD COLUMN updated_at INTEGER DEFAULT 0;
ALTER TABLE materials ADD COLUMN updated_at INTEGER DEFAULT 0;
ALTER TABLE money_transactions ADD COLUMN updated_at INTEGER DEFAULT 0;
ALTER TABLE material_transactions ADD COLUMN updated_at INTEGER DEFAULT 0;
ALTER TABLE deductions ADD COLUMN updated_at INTEGER DEFAULT 0;
```

وتحديث `upsertItem` ليحفظ `updated_at`:
```js
async function upsertItem(db, collection, item) {
  const now = Date.now();
  // في كل INSERT/UPDATE → updated_at = CURRENT_TIMESTAMP
}
```

وإضافة دالة `snapshotSince`:
```js
async function snapshotSince(db, since) {
  const [projects, people, materials, money, mat, ded] = await Promise.all([
    readRows(db, `SELECT data FROM projects WHERE updated_at > ${since} ORDER BY rowid ASC`),
    readRows(db, `SELECT kind, data FROM people WHERE updated_at > ${since} ORDER BY rowid ASC`),
    // ...etc
  ]);
  // نفس بناء snapshot...
}
```

---

## 📁 الملفات التي تحتاج تعديل

| الملف | التعديل |
|---|---|
| `functions/api/[[path]].js` | إضافة `?since=` للـ pull، إضافة `updated_at` في upsert، حماية delete |
| `frontend/assets/js/sync/SyncEngine.js` | تمرير `since` للـ pull، تقليل polling interval، إصلاح batch failure |
| `frontend/assets/js/modules/api.js` | `pullSync(since)` يقبل parameter |
| `frontend/assets/js/modules/store.js` | إصلاح seedDefaultData، إزالة `api.reset()` من `wipeAll` |
| `migrations/` | إضافة migration لـ `updated_at` في D1 |

---

## 🧪 كيف تتحقق أن الإصلاح نجح

1. **افتح النظام على التلفون واللاب في نفس الوقت**
2. **أضف مشروع جديد على التلفون**
3. **انتظر 30 ثانية** (أو اضغط زر المزامنة)
4. **تحقق أن المشروع ظهر على اللاب** بدون reload يدوي
5. **افتح DevTools** → Network → تحقق أن `/api/sync/pull` يُرجع البيانات الجديدة
6. **تحقق في Console** أنك تشوف: `[SyncEngine] Pull: X new items merged`

---

## ⚠️ السبب الأكثر احتمالاً لمشكلتك الآن

بناءً على التحليل، المشكلة الأرجح هي **مزيج من**:

1. **الـ pull يعمل لكن `spark:remote-data-updated` لا يُطلَق دائماً** → الـ UI لا يتحدث
2. **`pullRemoteChanges` يشتغل فقط بعد `push`** — لو ما في items pending في syncQueue على الجهاز الثاني → لا يحدث `push` → لا يحدث `pull`
3. **الـ polling interval طويل (60 ثانية)** + لو الـ tab مش focused → الـ `visibilitychange` listener يجيب البيانات لكن ببطء

**الحل السريع الفوري (بدون تعديلات كبيرة):**
- اجعل SyncEngine يعمل `triggerSync()` كل **15 ثانية** بدل 60
- تأكد أن `pullRemoteChanges` دائماً يطلق `spark:remote-data-updated` حتى لو ما في بيانات جديدة
- أزل شرط `if (queueCount > 0)` الذي يمنع الـ pull لو ما في push pending

---

## 🚀 الخطوة التالية

قل لي وأبدأ التطبيق على الكود مباشرة ملف بملف، مع migrations D1 وكل التفاصيل.
