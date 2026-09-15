# Operational Plan PWA v2 — نموذج البيانات متعدد المدارس

## الهدف
فصل بيانات المدارس والخطط والتقويم عن قالب الطباعة، بحيث يمكن للتطبيق خدمة أكثر من مدرسة على الجهاز نفسه مع الاحتفاظ بقالب طباعة واحد ثابت ومعتمد.

## التخزين المقترح
استخدام IndexedDB بدل الاعتماد على localStorage للبيانات الأساسية. يمكن إبقاء localStorage فقط لقيم بسيطة مثل المدرسة النشطة أو تفضيل الواجهة.

## الكيانات الرئيسية

## 1) AppSettings
إعدادات عامة للتطبيق وليست مرتبطة بمدرسة معينة.

```json
{
  "id": "app-settings",
  "schemaVersion": 2,
  "activeSchoolId": "school_xxx",
  "preferredCalendar": "both",
  "theme": "system",
  "uiScale": "normal",
  "lastBackupAt": null
}
```

## 2) School
يمثل مدرسة أو مجمعًا واحدًا.

```json
{
  "id": "school_xxx",
  "name": "مجمع أبو السلع الابتدائي والمتوسط",
  "shortName": "مجمع أبو السلع",
  "schoolType": "complex",
  "educationRegion": "جازان",
  "educationOffice": "",
  "logoAssetId": "asset_logo_xxx",
  "qrAssetId": "asset_qr_xxx",
  "isArchived": false,
  "createdAt": "2026-09-15T00:00:00+03:00",
  "updatedAt": "2026-09-15T00:00:00+03:00"
}
```

### schoolType
- elementary
- middle
- secondary
- complex
- other

## 3) StaffMember
مسؤول أو شخص يظهر في إعدادات المدرسة أو التوقيعات.

```json
{
  "id": "staff_xxx",
  "schoolId": "school_xxx",
  "role": "principal",
  "jobTitle": "مدير المدرسة",
  "name": "اسم المسؤول",
  "printOrder": 1,
  "isActive": true
}
```

### role
- principal
- teachers_affairs_deputy
- educational_affairs_deputy
- supervisor
- custom

## 4) Plan
الخطة التشغيلية نفسها.

```json
{
  "id": "plan_xxx",
  "schoolId": "school_xxx",
  "title": "الخطة التشغيلية - الفترة الأولى",
  "academicYearHijri": "1448",
  "period": "term1",
  "status": "active",
  "startDateGregorian": "2026-08-23",
  "weekCount": 19,
  "calendarMode": "both",
  "printTemplateVersion": "print-template-v1",
  "createdAt": "2026-09-15T00:00:00+03:00",
  "updatedAt": "2026-09-15T00:00:00+03:00"
}
```

### status
- draft
- active
- archived

### period
- term1
- term2
- custom

## 5) PlanWeek
يمثل أسبوعًا واحدًا داخل الخطة.

```json
{
  "id": "week_xxx",
  "planId": "plan_xxx",
  "weekNumber": 1,
  "startDateGregorian": "2026-08-23",
  "endDateGregorian": "2026-08-27",
  "startDateHijri": "1448/03/10",
  "endDateHijri": "1448/03/14",
  "isManuallyAdjusted": false,
  "notes": ""
}
```

## 6) WeekDayState
حالة كل يوم داخل الأسبوع.

```json
{
  "id": "weekday_xxx",
  "weekId": "week_xxx",
  "day": "sunday",
  "dateGregorian": "2026-08-23",
  "status": "school_day",
  "label": "الأحد"
}
```

### status
- school_day
- holiday
- exam
- suspended
- custom

## 7) CalendarEvent
الإجازات والمناسبات والاختبارات.

```json
{
  "id": "event_xxx",
  "schoolId": "school_xxx",
  "planId": "plan_xxx",
  "name": "إجازة اليوم الوطني",
  "type": "national_occasion",
  "startDateGregorian": "2026-09-23",
  "endDateGregorian": "2026-09-23",
  "showInsideWeek": true,
  "showAsPrintBar": false,
  "priority": 50,
  "notes": ""
}
```

### type
- holiday
- national_occasion
- exam
- suspension
- midyear_break
- custom

## 8) PrintProfile
إعدادات بيانات الطباعة المرتبطة بالمدرسة والخطة، بدون السماح بتغيير البنية الأساسية للقالب.

```json
{
  "id": "print_xxx",
  "schoolId": "school_xxx",
  "planId": "plan_xxx",
  "templateVersion": "print-template-v1",
  "showLogo": true,
  "showQr": true,
  "showGregorian": true,
  "showHijri": true,
  "signatureLayout": "official-3-column"
}
```

### مهم
لا يتضمن PrintProfile أي حقول مثل:
- عرض الصفحة.
- ارتفاع الصفحة.
- scale.
- موضع التوقيعات بالـ mm.
- CSS مخصص.

هذه القيم جزء من قالب الطباعة الثابت وليست إعدادات للمستخدم.

## 9) Asset
لتخزين الشعار وQR محليًا بطريقة منظمة.

```json
{
  "id": "asset_xxx",
  "schoolId": "school_xxx",
  "kind": "logo",
  "mimeType": "image/png",
  "blob": "<IndexedDB Blob>",
  "createdAt": "2026-09-15T00:00:00+03:00"
}
```

## العلاقات
```text
School
 ├── StaffMember[]
 ├── Asset[]
 ├── CalendarEvent[]
 └── Plan[]
       ├── PlanWeek[]
       │     └── WeekDayState[]
       ├── CalendarEvent[]
       └── PrintProfile
```

## قواعد النزاهة
- كل Plan يجب أن ينتمي إلى School واحدة فقط.
- حذف مدرسة يجب أن يكون Soft Delete / Archive أولًا.
- حذف خطة لا يحذف المدرسة.
- CalendarEvent يمكن أن يكون على مستوى المدرسة أو خطة محددة.
- كل خطة تحفظ نسخة `printTemplateVersion` المستخدمة عند إنشائها.
- تغيير المدرسة النشطة لا يغير بيانات خطة مدرسة أخرى.

## النسخ والنسخ المتعدد
### نسخ مدرسة
ينسخ:
- بيانات المدرسة.
- المسؤولين.
- إعدادات الطباعة العامة.

ولا ينسخ الخطط القديمة افتراضيًا إلا إذا اختار المستخدم ذلك.

### نسخ خطة
ينسخ:
- تعريف الخطة.
- الأسابيع.
- الأحداث المرتبطة بالخطة.
- PrintProfile.

مع إنشاء IDs جديدة بالكامل.

## النسخ الاحتياطي
صيغة النسخة الاحتياطية المقترحة:

```json
{
  "format": "operational-plan-pwa-backup",
  "schemaVersion": 2,
  "exportedAt": "2026-09-15T00:00:00+03:00",
  "appVersion": "2.0.0",
  "schools": [],
  "staff": [],
  "plans": [],
  "weeks": [],
  "weekDays": [],
  "events": [],
  "printProfiles": [],
  "assets": []
}
```

## ترحيل بيانات النسخة الحالية
عند أول تشغيل لـ v2:
1. فحص بيانات localStorage القديمة.
2. إذا وجدت خطة قديمة، يعرض التطبيق خيار: استيراد النسخة الحالية.
3. ينشئ School واحدة من البيانات الموجودة.
4. ينشئ Plan للفترة الأولى وPlan للفترة الثانية حسب البيانات الحالية.
5. يحفظ `printTemplateVersion = print-template-v1`.
6. لا يحذف localStorage القديم إلا بعد نجاح الترحيل وتأكيد المستخدم.

## استراتيجية الإصدارات
- schemaVersion: إصدار قاعدة البيانات.
- appVersion: إصدار التطبيق.
- printTemplateVersion: إصدار قالب الطباعة.

هذه الإصدارات مستقلة عن بعضها حتى نستطيع تحديث الواجهة دون المساس بالطباعة.
