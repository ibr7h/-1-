# الخطة التشغيلية — PWA

نسخة PWA من الصفحة الأصلية مع الحفاظ على وظائف التعديل المباشر، التخزين المحلي، حساب التواريخ والطباعة.

## رابط التطبيق

بعد نشر GitHub Pages من الفرع `main` والمسار `/ (root)` يكون الرابط الأساسي:

`https://ibr7h.github.io/-1-/`

وسيحوّل تلقائيًا إلى:

`https://ibr7h.github.io/-1-/operational-plan-pwa/`

## الملفات

- `index.html` — الصفحة الرئيسية وإعدادات PWA.
- `manifest.webmanifest` — اسم التطبيق وبيانات التثبيت والأيقونات.
- `sw.js` — Service Worker للتخزين المؤقت والعمل دون اتصال.
- `cairo-local.css` — إعداد خط Cairo مع بدائل نظامية.
- `icons/` — أيقونات التطبيق وApple Touch Icon.
- `/.nojekyll` — يجعل GitHub Pages يخدم الملفات الثابتة مباشرة.
- `/index.html` — يحوّل رابط Pages الأساسي إلى مجلد التطبيق.

## GitHub Pages

المستودع منظم للنشر من:

`Settings → Pages → Deploy from a branch → main → / (root)`

بعد أول فتح متصل بالإنترنت، يحاول Service Worker تخزين ملفات التطبيق والاعتماديات المطلوبة، ثم يوفر نسخة مخزنة عند فقد الاتصال.

## التثبيت على iPhone / iPad

1. افتح رابط التطبيق في Safari.
2. اضغط زر المشاركة.
3. اختر **Add to Home Screen / إضافة إلى الشاشة الرئيسية**.
4. افتح التطبيق مرة واحدة وهو متصل بالإنترنت قبل الاعتماد على الوضع دون اتصال.

## التثبيت على Android / Chrome

افتح الرابط في Chrome ثم اختر **Install app / تثبيت التطبيق** أو **Add to Home screen** بحسب الجهاز.

## التشغيل المحلي

Service Worker يحتاج HTTPS أو localhost؛ لا تفتح `index.html` مباشرة عبر `file://`.

```bash
cd operational-plan-pwa
python3 -m http.server 8080
```

ثم افتح:

`http://localhost:8080`
