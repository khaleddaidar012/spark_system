# Task Overview — Spark ERP Financial & Project Enhancements

Status: pending
Priority: high

## 1. Executive Summary & Architecture Overview

تحويل متطلبات نظام Spark Engineering ERP الواردة في `tasks.md` إلى خطة تنفيذ معمارية مفصلة وعالية الدقة. ترتكز هذه التحسينات على 4 أركان مالية وتشغيلية رئيسية:

1. **ربط المصروفات بمراحل المشروع وتحديث تكلفة كل مرحلة (Live Phase Cost Accumulation)**:
   - ربط جميع عمليات الصرف (سواء من الإضافة السريعة Quick Add أو من داخل صفحة المشروع أو صفحة الحسابات) بالمرحلة النشطة أو المختارة للمشروع (`project.phases[i]`).
   - تحديث وحساب التكلفة الإجمالية لكل مرحلة/حالة تلقائياً وبشكل حي، وإظهارها بوضوح في سجل حالات المشروع (Phase History Log).
2. **كشف حساب الموردين والمقاولين مع الخصومات وطباعة PDF (Supplier & Contractor Statements)**:
   - إضافة زر "كشف حساب" في صفحتي المقاولين والموردين يتيح تحديد فترة زمنية (من تاريخ إلى تاريخ).
   - عرض المعاملات المالية (الوارد، الصادر، المدفوع، الخصم، الرصيد).
   - إمكانية تطبيق خصومات مباشرة على كشف الحساب وتوثيقها في سجل الخصومات.
   - تصدير وطباعة كشف حساب رسمي احترافي بصيغة PDF يدعم اللغة العربية واتجاه RTL.
3. **إحصائيات إجمالي الواردات في الحسابات المالية (Finance Inflow KPI)**:
   - إضافة مؤشر "إجمالي الواردات" (اليوم، هذا الأسبوع، هذا الشهر، والإجمالي الكلي) بجانب "إجمالي المصروفات" وصافي الرصيد في صفحة `finance.html`.
4. **شريط المؤشرات المالية العلوية في صفحة المشاريع (Projects Header KPIs)**:
   - 5 بطاقات إحصائية متجاورة في أعلى صفحة المشاريع:
     1. إجمالي الوارد (Total Inflow)
     2. إجمالي الصادر (Total Outflow)
     3. الفرق (Net Difference = الوارد - الصادر)
     4. الربح المتوقع (Expected Profit - مدخل يدوي قابل للتعديل والحفظ)
     5. الربح الفعلي (Actual Profit - معادلة ديناميكية = الربح المتوقع + الفرق بين الوارد والصادر).

---

## 2. Dependency Graph & Execution Order

```text
[ Task 01: ربط المصروفات بالمراحل ] ───┐
                                       ├──► [ Task 04: إحصائيات المشاريع العلوية ]
[ Task 03: إحصائيات الواردات المالية ] ──┘                  │
                                                            │
[ Task 02: كشف حساب المقاولين والموردين ]                    │
                                                            ▼
                                        [ Task 05: اختبارات التكامل والتحقق الشامل ]
```

### الترتيب الموصى به للتنفيذ:
- [ ] **Task 01 — Project Stage Financial Tracking**: بناء وتجهيز ربط المصاريف بالمراحل وحساب التكلفة التراكمية في `calc.js` و `store.js` و `project-phases.js`.
- [ ] **Task 02 — Supplier & Contractor Statements & PDF Export**: بناء محرك كشف الحساب والخصومات ونظام الطباعة PDF باللغة العربية.
- [ ] **Task 03 — Financial Accounts Income Statistics**: إضافة كروت وشرائح إجمالي الواردات إلى صفحة الحسابات المالية `finance.html`.
- [ ] **Task 04 — Projects Financial Summary Header**: ربط وتجميع المؤشرات الخمسة في أعلى صفحة المشاريع `projects.html`.
- [ ] **Task 05 — Integration, Regression & Calculation Validation**: فحص الحسابات الدقيقة ومنع التكرار (Double Counting) واختبار السيناريوهات الحية.

---

## 3. تفاصيل ملفات المهام (Task Files)

- [task_01_project_stage_financial_tracking.md](file:///f:/%D9%86%D8%B3%D8%AE%D8%A9%20%D8%A7%D8%AC%D8%A7%D8%B2%D8%A9%20%D8%A7%D9%84%D8%B9%D9%8A%D8%AF/webDevelopmet/%D9%85%D9%88%D9%82%D8%B9%20%D8%A7%D9%84%D9%85%D9%82%D8%A7%D9%88%D9%85%D9%84%D8%A7%D8%AA/tasks/task_01_project_stage_financial_tracking.md)
- [task_02_supplier_contractor_statements.md](file:///f:/%D9%86%D8%B3%D8%AE%D8%A9%20%D8%A7%D8%AC%D8%A7%D8%B2%D8%A9%20%D8%A7%D9%84%D8%B9%D9%8A%D8%AF/webDevelopmet/%D9%85%D9%88%D9%82%D8%B9%20%D8%A7%D9%84%D9%85%D9%82%D8%A7%D9%88%D9%85%D9%84%D8%A7%D8%AA/tasks/task_02_supplier_contractor_statements.md)
- [task_03_financial_accounts_income_stats.md](file:///f:/%D9%86%D8%B3%D8%AE%D8%A9%20%D8%A7%D8%AC%D8%A7%D8%B2%D8%A9%20%D8%A7%D9%84%D8%B9%D9%8A%D8%AF/webDevelopmet/%D9%85%D9%88%D9%82%D8%B9%20%D8%A7%D9%84%D9%85%D9%82%D8%A7%D9%88%D9%85%D9%84%D8%A7%D8%AA/tasks/task_03_financial_accounts_income_stats.md)
- [task_04_projects_financial_summary.md](file:///f:/%D9%86%D8%B3%D8%AE%D8%A9%20%D8%A7%D8%AC%D8%A7%D8%B2%D8%A9%20%D8%A7%D9%84%D8%B9%D9%8A%D8%AF/webDevelopmet/%D9%85%D9%88%D9%82%D8%B9%20%D8%A7%D9%84%D9%85%D9%82%D8%A7%D9%88%D9%85%D9%84%D8%A7%D8%AA/tasks/task_04_projects_financial_summary.md)
- [task_05_integration_testing_and_validation.md](file:///f:/%D9%86%D8%B3%D8%AE%D8%A9%20%D8%A7%D8%AC%D8%A7%D8%B2%D8%A9%20%D8%A7%D9%84%D8%B9%D9%8A%D8%AF/webDevelopmet/%D9%85%D9%88%D9%82%D8%B9%20%D8%A7%D9%84%D9%85%D9%82%D8%A7%D9%88%D9%85%D9%84%D8%A7%D8%AA/tasks/task_05_integration_testing_and_validation.md)
