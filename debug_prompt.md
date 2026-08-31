# برومبت تشخيص وإصلاح مشكلة اختلاف البيانات بين اللابتوب والموبايل — Spark ERP

> انسخ البرومبت ده كامل وابعته للذكاء الاصطناعي مع ملفات المشروع.

---

## البرومبت:

```
أنت مهندس برمجيات متخصص في تصحيح أخطاء المزامنة (Sync Bugs) في تطبيقات الـ Offline-First. عندي مشروع اسمه Spark ERP — نظام إدارة مقاولات يعمل كـ PWA. المشكلة الأساسية: البيانات اللي بتظهر على اللابتوب مختلفة عن اللي بتظهر على الموبايل (نفس الحساب، نفس اليوزر).

## هيكل المشروع:

### البنية التحتية:
- **Frontend**: Vanilla JS + HTML + CSS (PWA مع Service Worker)
- **Backend**: Cloudflare Pages Functions (catch-all API)
- **Database**: Cloudflare D1 (SQLite) — الـ server-side source of truth
- **Local DB**: IndexedDB عبر Dexie.js — كل جهاز عنده نسخة محلية
- **Sync**: SyncEngine يعمل push/pull بين IndexedDB و D1

### الملفات الجوهرية اللي لازم تقرأها كلها بعناية:

1. **`frontend/assets/js/db/db.js`** — تعريف الـ IndexedDB schema (Dexie v1)
2. **`frontend/assets/js/modules/store.js`** — Data Store: الكاش في الميموري + القراءة/الكتابة لـ IndexedDB + syncQueue
3. **`frontend/assets/js/sync/SyncEngine.js`** — محرك المزامنة: push pending → pull remote → reconcile
4. **`frontend/assets/js/sync/sync-queue.js`** — مدير طابور العمليات المعلقة
5. **`frontend/assets/js/modules/api.js`** — API client (fetch wrapper)
6. **`frontend/assets/js/modules/calc.js`** — كل الحسابات المالية
7. **`frontend/sw.js`** — Service Worker (CacheFirst للـ static, Network للـ API)
8. **`functions/api/[[path]].js`** — Backend API كامل (auth + CRUD + sync push/pull + snapshot)
9. **`migrations/0001_init.sql`** — D1 schema
10. **`frontend/assets/js/repositories/base-repository.js`** — Repository pattern layer

### كيف نظام البيانات شغال (Data Flow):

```
المستخدم يضيف/يعدل بيانات
    ↓
store.save() → يكتب في cache[] (ميموري) + IndexedDB + syncQueue
    ↓
spark:queue-updated event → SyncEngine.triggerSync() (بعد 1.5 ثانية debounce)
    ↓
SyncEngine.pushPendingOperations() → POST /api/sync/push → D1 upsert
    ↓
SyncEngine.pullRemoteChanges() → GET /api/sync/pull → snapshot من D1 → reconcile مع IndexedDB
    ↓
spark:remote-data-updated event → store.loadCacheFromIndexedDB() → spark:data-changed → UI refresh
```

### الأماكن المشتبه فيها (Suspect Areas):

#### 1. مشكلة الـ `kind` vs `roles` في جدول `people`:
- الـ Frontend بيفلتر الناس بطريقة معقدة — شوف `loadCacheFromIndexedDB()` في store.js سطر 121-124
- لما السيرفر بيرجع بيانات في `pullRemoteChanges()` — بيعمل `bulkPut` مع `kind: key` (سطر 310 في SyncEngine.js)
- لكن لما `reconcileServerSnapshot()` في store.js بيشتغل — برضو بيعمل `bulkPut` مع `kind: key` (سطر 148)
- **سؤال**: لو شخص واحد ليه أكتر من role — ممكن يتكتب مرتين في people table بنفس الـ id لكن kind مختلف → الأخير يكسب؟

#### 2. الـ Race Condition بين `initStore()` و `SyncEngine`:
- `initStore()` بيعمل `api.snapshot()` في الخلفية (fire-and-forget) → سطر 96-109 في store.js
- في نفس الوقت، SyncEngine بيعمل `triggerSync()` بعد 800ms → سطر 84-86 في SyncEngine.js
- الاتنين بيعملوا `reconcileServerSnapshot` / `pullRemoteChanges` → كل واحد بيعمل delete+bulkPut
- **سؤال**: لو الاتنين اشتغلوا في نفس الوقت → ممكن واحد يمسح اللي التاني كتبه؟

#### 3. الـ Service Worker Cache:
- الـ SW بيعمل cache للـ static assets بس (CacheFirst strategy)
- الـ API calls (`/api/*`) بتعدي مباشرة (سطر 237-239 في sw.js)
- **سؤال**: هل ممكن الـ SW cache يخزن version قديمة من ملفات JS فيها logic مختلف؟ → `CACHE_NAME = "spark-erp-cache-v24"`

#### 4. مشكلة الـ `syncStatus` filtering:
- في `pullRemoteChanges()` سطر 302 و 314-315 في SyncEngine.js — بيجيب بس الـ `syncStatus === "synced"` ويمسح اللي مش موجود على السيرفر
- لكن لو عنصر `syncStatus === "pending"` على الموبايل ولسه ما اتعملش push → مش هيتمسح → تمام
- **سؤال**: بس لو الـ push فشل والـ pull نجح → الموبايل هيبقى فيه بيانات pending + بيانات synced من اللاب → ممكن يحصل duplicates؟

#### 5. الـ `save()` function fire-and-forget:
- `store.save()` سطر 239-261 — الكتابة للـ IndexedDB بتحصل في `(async () => {...})()` بدون await
- لو الكتابة فشلت → الكاش في الميموري فيه البيانات بس IndexedDB لأ
- بعد refresh → البيانات اللي في الكاش بس هتروح

#### 6. `reconcileServerSnapshot` vs `pullRemoteChanges` (ازدواجية):
- `initStore()` بيستعمل `api.snapshot()` + `reconcileServerSnapshot()` 
- `SyncEngine` بيستعمل `api.pullSync()` + inline reconcile logic
- هم بيعملوا نفس الحاجة تقريباً بس بكود مختلف → **أي اختلاف صغير بينهم = بيانات مختلفة**

### الـ D1 Server-side Schema:
```sql
-- كل البيانات بتتخزن كـ JSON في column اسمه `data`
-- people table عندها `kind` column (suppliers|contractors|clients|others)
-- الـ snapshot function بتقرأ من D1 وبتفرز الـ people حسب `kind`
-- الـ upsertItem بتكتب الـ item كامل كـ JSON في `data` column
```

## المطلوب منك:

### الخطوة 1: اقرأ كل الملفات الجوهرية المذكورة فوق بعناية شديدة

### الخطوة 2: حدد بالضبط كل الأخطاء اللي ممكن تسبب اختلاف البيانات بين جهازين، مرتبة حسب الأولوية:
لكل خطأ:
- **وصف المشكلة** بالعربي ببساطة
- **الملف والسطر** بالظبط
- **سيناريو إعادة الإنتاج** (كيف المشكلة بتحصل step by step)
- **التأثير** (إيه اللي بيظهر غلط عند المستخدم)

### الخطوة 3: اكتب الإصلاح (Fix) لكل مشكلة:
- كل fix لازم يكون **متوافق تماماً** مع الكود الحالي — ما تكسرش حاجة شغالة
- لو الإصلاح بيأثر على ملفات تانية، وضح
- اكتب الكود الجديد بالكامل مع تعليقات بالعربي
- لو ممكن تكتب الحل كـ diff (قبل/بعد) يبقى أحسن

### الخطوة 4: اقترح خطة اختبار:
- كيف أتأكد إن المشكلة اتحلت
- سيناريوهات اختبار يدوية (لابتوب + موبايل)

## قواعد مهمة:
- ❌ **لا تعيد كتابة النظام من الصفر** — صلح المشاكل الموجودة بس
- ❌ **لا تغير الـ DB schema** (لا IndexedDB ولا D1) إلا لو ضروري جداً ووضحت السبب
- ❌ **لا تمسح أو تعدل الـ seed data أو الـ default data**
- ✅ **حافظ على كل الـ comments والـ docstrings الموجودة**
- ✅ **تأكد إن الحل يشتغل في كل الأجهزة** (Chrome Desktop, Chrome Android, Safari iOS)
- ✅ **لو فيه race condition — استخدم locks أو flags بسيطة مش مكتبات خارجية**
```

---

> [!TIP]
> **نصيحة**: لما تبعت البرومبت ده، أرفق معاه الملفات التالية كاملة:
> 1. `frontend/assets/js/modules/store.js`
> 2. `frontend/assets/js/sync/SyncEngine.js`
> 3. `frontend/assets/js/modules/calc.js`
> 4. `frontend/assets/js/modules/api.js`
> 5. `frontend/assets/js/db/db.js`
> 6. `frontend/assets/js/sync/sync-queue.js`
> 7. `frontend/sw.js`
> 8. `functions/api/[[path]].js`
> 9. `migrations/0001_init.sql`
> 10. `frontend/assets/js/repositories/base-repository.js`

> [!IMPORTANT]
> **مهم**: لو الذكاء الاصطناعي اقترح حلول كتير، ابدأ بالمشاكل اللي ليها علاقة بالـ **race condition بين `initStore` و `SyncEngine`** والـ **ازدواجية في reconcile logic** — دول غالباً السبب الرئيسي.
