# الخطة التشغيلية — PWA

هذه نسخة PWA من الصفحة الأصلية، مع الحفاظ على وظائف التعديل المباشر، التخزين المحلي، حساب التواريخ والطباعة.

## الملفات

- `index.html` — الصفحة الرئيسية بعد إضافة إعدادات PWA.
- `manifest.webmanifest` — بيانات التثبيت واسم التطبيق والأيقونات.
- `sw.js` — Service Worker للتشغيل دون اتصال بعد أول زيارة.
- `cairo-local.css` — تحميل خط Cairo مع بدائل نظامية.
- `icons/` — أيقونات التطبيق.

## التشغيل المحلي

لا تفتح `index.html` مباشرة عبر `file://` لأن Service Worker يحتاج HTTPS أو localhost.

مثال:

```bash
cd operational-plan-pwa
python3 -m http.server 8080
```

ثم افتح:

`http://localhost:8080`

## GitHub Pages

ارفع محتويات هذا المجلد إلى جذر المستودع، ثم من:

`Settings → Pages → Deploy from a branch → main / root`

بعد النشر افتح الموقع مرة واحدة متصلاً بالإنترنت لكي يتم تخزين Tailwind وخط Cairo، ثم يمكن للتطبيق العمل دون اتصال بدرجة كبيرة.

## iPhone / iPad

افتح الموقع في Safari ثم:

`Share → Add to Home Screen`
