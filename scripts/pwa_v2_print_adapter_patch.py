from pathlib import Path
import re

APP = Path('operational-plan-pwa-v2/app.js')
V2_INDEX = Path('operational-plan-pwa-v2/index.html')
V2_SW = Path('operational-plan-pwa-v2/sw.js')
PRINT_INDEX = Path('operational-plan-pwa/index.html')
PRINT_SW = Path('operational-plan-pwa/sw.js')

# Wire the v2 print button to the adapter without changing the UI layout.
app = APP.read_text(encoding='utf-8')
old_action = "    if (action === 'launch-print') window.open('../operational-plan-pwa/index.html', '_blank', 'noopener');"
new_action = """    if (action === 'launch-print') {
      if (!window.PrintAdapter) { toast('محول الطباعة غير متاح'); return; }
      window.PrintAdapter.openSchoolPrint(state.activeSchool, state.plans)
        .catch(error => toast(error.message || 'تعذر تجهيز الطباعة'));
    }"""
if old_action in app:
    app = app.replace(old_action, new_action, 1)
elif 'PrintAdapter.openSchoolPrint' not in app:
    raise SystemExit('Print action marker not found')

old_text = 'لن نغيّر قياسات A4 أو إعدادات طباعة الكمبيوتر والآيفون من واجهة v2. الربط الكامل لبيانات المدرسة النشطة بالقالب سيكون في المرحلة التالية.'
new_text = 'يتم تمرير بيانات المدرسة والخطط والأسابيع والإجازات والمسؤولين إلى القالب الرسمي دون تغيير قياسات A4 أو تنسيق طباعة الكمبيوتر والآيفون.'
if old_text in app:
    app = app.replace(old_text, new_text, 1)
APP.write_text(app, encoding='utf-8')

# Load adapter before app.js.
index = V2_INDEX.read_text(encoding='utf-8')
if './print-adapter.js' not in index:
    marker = '  <script src="./editor.js"></script>\n  <script src="./app.js"></script>'
    replacement = '  <script src="./editor.js"></script>\n  <script src="./print-adapter.js"></script>\n  <script src="./app.js"></script>'
    if marker not in index:
        raise SystemExit('V2 index script marker not found')
    index = index.replace(marker, replacement, 1)
V2_INDEX.write_text(index, encoding='utf-8')

# Cache adapter in v2 shell.
sw = V2_SW.read_text(encoding='utf-8')
sw = re.sub(r"operational-plan-pwa-v2-shell-\d+", 'operational-plan-pwa-v2-shell-5', sw, count=1)
if "'./print-adapter.js'" not in sw:
    sw = sw.replace("  './editor.js',", "  './editor.js',\n  './print-adapter.js',", 1)
V2_SW.write_text(sw, encoding='utf-8')

# Add the guarded bridge to the frozen print template. It is a no-op unless
# the page is opened with ?printSource=pwa-v2, and it does not add CSS.
print_index = PRINT_INDEX.read_text(encoding='utf-8')
if './print-bridge-v2.js' not in print_index:
    if '</body>' not in print_index:
        raise SystemExit('Print template body marker not found')
    print_index = print_index.replace('</body>', '    <script src="./print-bridge-v2.js"></script>\n</body>', 1)
PRINT_INDEX.write_text(print_index, encoding='utf-8')

# Cache bridge in the print PWA without changing print CSS/layout.
print_sw = PRINT_SW.read_text(encoding='utf-8')
print_sw = re.sub(r"abu-sula-operational-plan-v\d+", 'abu-sula-operational-plan-v17', print_sw, count=1)
if "'./print-bridge-v2.js'" not in print_sw:
    print_sw = print_sw.replace("  './cairo-local.css',", "  './cairo-local.css',\n  './print-bridge-v2.js',", 1)
PRINT_SW.write_text(print_sw, encoding='utf-8')

print('Integrated PWA v2 print adapter with the frozen print template.')
