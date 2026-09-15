from pathlib import Path
import re

APP = Path('operational-plan-pwa-v2/app.js')
INDEX = Path('operational-plan-pwa-v2/index.html')
SW = Path('operational-plan-pwa-v2/sw.js')
CHECK = Path('.github/workflows/pwa-v2-check.yml')

app = APP.read_text(encoding='utf-8')

# 1) Turn the disabled placeholder into a real editor action.
old_button = '<button class="text-button" disabled style="opacity:.45">تحرير الأسابيع — قريبًا</button>'
new_button = '<button class="text-button" data-editor-plan="${escapeHTML(p.id)}">تحرير الأسابيع</button>'
if old_button in app:
    app = app.replace(old_button, new_button, 1)
elif 'data-editor-plan="${escapeHTML(p.id)}"' not in app:
    raise SystemExit('Plan editor button marker not found')

# 2) Calendar navigation should open the real calendar manager.
old_calendar_line = "    if (state.view === 'calendar') root.innerHTML = calendarView();"
new_calendar_line = "    if (state.view === 'calendar') { root.innerHTML = calendarView(); setTimeout(() => window.PlanEditor?.openCalendar(state.activeSchool, state.plans), 0); }"
if old_calendar_line in app:
    app = app.replace(old_calendar_line, new_calendar_line, 1)
elif 'PlanEditor?.openCalendar(state.activeSchool, state.plans)' not in app:
    raise SystemExit('Calendar render marker not found')

# 3) Bind plan cards to the editor after each render.
bind_marker = "    document.querySelectorAll('[data-edit-school]').forEach(btn => btn.addEventListener('click', () => openSchoolDialog(btn.dataset.editSchool)));"
bind_addition = bind_marker + "\n    window.PlanEditor?.bindPlanButtons($('viewRoot'), state.activeSchool, state.plans);"
if bind_marker in app and 'PlanEditor?.bindPlanButtons' not in app:
    app = app.replace(bind_marker, bind_addition, 1)
elif 'PlanEditor?.bindPlanButtons' not in app:
    raise SystemExit('View binding marker not found')

# 4) Any newly-created plan should immediately receive its week records.
save_marker = "    await PlanDB.put('plans', plan);\n    $('planDialog').close();"
save_replacement = "    await PlanDB.put('plans', plan);\n    await window.PlanEditor?.ensureWeeks(plan);\n    $('planDialog').close();"
if save_marker in app:
    app = app.replace(save_marker, save_replacement, 1)
elif 'await window.PlanEditor?.ensureWeeks(plan);' not in app:
    raise SystemExit('Plan save marker not found')

APP.write_text(app, encoding='utf-8')

# 5) Load the new editor styles and script before the main app controller.
index = INDEX.read_text(encoding='utf-8')
if './editor.css' not in index:
    index = index.replace(
        '  <link rel="stylesheet" href="./setup-wizard.css" />',
        '  <link rel="stylesheet" href="./setup-wizard.css" />\n  <link rel="stylesheet" href="./editor.css" />',
        1,
    )
if './editor.js' not in index:
    index = index.replace(
        '  <script src="./setup-wizard.js"></script>\n  <script src="./app.js"></script>',
        '  <script src="./setup-wizard.js"></script>\n  <script src="./editor.js"></script>\n  <script src="./app.js"></script>',
        1,
    )
INDEX.write_text(index, encoding='utf-8')

# 6) Cache the new editor assets for offline PWA use.
sw = SW.read_text(encoding='utf-8')
sw = re.sub(r"operational-plan-pwa-v2-shell-\d+", 'operational-plan-pwa-v2-shell-4', sw, count=1)
if "'./editor.css'" not in sw:
    sw = sw.replace("  './setup-wizard.css',", "  './setup-wizard.css',\n  './editor.css',", 1)
if "'./editor.js'" not in sw:
    sw = sw.replace("  './setup-wizard.js',", "  './setup-wizard.js',\n  './editor.js',", 1)
SW.write_text(sw, encoding='utf-8')

# 7) Extend CI validation to cover the editor assets.
check = CHECK.read_text(encoding='utf-8')
if 'node --check operational-plan-pwa-v2/editor.js' not in check:
    check = check.replace(
        '          node --check operational-plan-pwa-v2/app.js',
        '          node --check operational-plan-pwa-v2/app.js\n          node --check operational-plan-pwa-v2/editor.js',
        1,
    )
if 'test -f operational-plan-pwa-v2/editor.js' not in check:
    check = check.replace(
        '          test -f operational-plan-pwa-v2/app.js',
        '          test -f operational-plan-pwa-v2/app.js\n          test -f operational-plan-pwa-v2/editor.js\n          test -f operational-plan-pwa-v2/editor.css',
        1,
    )
CHECK.write_text(check, encoding='utf-8')

print('Integrated week editor, calendar manager, offline cache, and CI checks.')
