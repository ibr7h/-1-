from pathlib import Path

APP = Path('operational-plan-pwa-v2/app.js')
EDITOR = Path('operational-plan-pwa-v2/editor.js')
SW = Path('operational-plan-pwa-v2/sw.js')
BRIDGE = Path('operational-plan-pwa/print-bridge-v2.js')


def replace_once(text, old, new, label):
    if old in text:
        return text.replace(old, new, 1)
    if new in text:
        return text
    raise SystemExit(f'Marker not found: {label}')

# Correct user-facing week totals for the approved operational grid.
app = APP.read_text(encoding='utf-8')
app = replace_once(
    app,
    'سيتم ضبط الفترتين على 19 أسبوعًا دراسيًا لكل فترة وإضافة المواعيد الرسمية الثابتة.',
    'سيتم ضبط الفترة الأولى على 19 أسبوعًا والفترة الثانية على 18 أسبوعًا، وإضافة المواعيد الثابتة وإجازات جازان الإضافية.',
    'official plan confirmation count',
)
app = replace_once(
    app,
    "toast('تم اعتماد خطة 1448–1449هـ: 38 أسبوعًا دراسيًا');",
    "toast('تم اعتماد خطة 1448–1449هـ: 37 أسبوعًا تشغيليًا (19 + 18)');",
    'official plan toast count',
)
APP.write_text(app, encoding='utf-8')

# Give every week a persistent operational-day pattern. Existing custom patterns
# are kept only when explicitly marked as customized.
editor = EDITOR.read_text(encoding='utf-8')
editor = replace_once(
    editor,
    "          endDate,\n          content: '',",
    "          endDate,\n          dayStatuses: ['on', 'on', 'on', 'off', 'off'],\n          dayStatusesCustomized: false,\n          content: '',",
    'new week day statuses',
)
old_norm = """      if (Number(week.number || 0) !== normalizedNumber) { week.number = normalizedNumber; changed = true; }
      if (Number(week.weekNumber || 0) !== normalizedNumber) { week.weekNumber = normalizedNumber; changed = true; }
      if (changed) await PlanDB.put('weeks', week);"""
new_norm = """      if (Number(week.number || 0) !== normalizedNumber) { week.number = normalizedNumber; changed = true; }
      if (Number(week.weekNumber || 0) !== normalizedNumber) { week.weekNumber = normalizedNumber; changed = true; }
      if (!Array.isArray(week.dayStatuses) || week.dayStatuses.length < 5) {
        week.dayStatuses = ['on', 'on', 'on', 'off', 'off'];
        week.dayStatusesCustomized = false;
        changed = true;
      }
      if (changed) await PlanDB.put('weeks', week);"""
editor = replace_once(editor, old_norm, new_norm, 'normalize legacy day statuses')
EDITOR.write_text(editor, encoding='utf-8')

# Stop relying on whatever the legacy template happened to render. The bridge
# now writes the stored operational pattern explicitly, while events override
# the mark for the affected date.
bridge = BRIDGE.read_text(encoding='utf-8')
old_else = """      } else {
        // Preserve the approved operational-plan status already present in
        // the frozen template (✓ / X). Do not replace all days with ✓.
      }"""
new_else = """      } else {
        const stored = Array.isArray(week?.dayStatuses) ? week.dayStatuses : null;
        const status = stored?.[dayIndex] || (dayIndex < 3 ? 'on' : 'off');
        const isOn = !['off', 'x', 'X', false, 0].includes(status);
        row.innerHTML = `<td>${DAY_NAMES[dayIndex] || ''}</td><td class=\"font-bold ${isOn ? 'text-emerald-700' : 'text-rose-600'} clickable-status\">${isOn ? '✓' : 'X'}</td>`;
      }"""
bridge = replace_once(bridge, old_else, new_else, 'explicit operational day pattern')
BRIDGE.write_text(bridge, encoding='utf-8')

# Force a new app-shell cache after the calendar correction.
sw = SW.read_text(encoding='utf-8')
sw = replace_once(sw, "operational-plan-pwa-v2-shell-6", "operational-plan-pwa-v2-shell-7", 'PWA cache version')
SW.write_text(sw, encoding='utf-8')

print('Finalized 37-week calendar, persistent day pattern, and print bridge marks.')
