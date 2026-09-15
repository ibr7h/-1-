from pathlib import Path

APP = Path('operational-plan-pwa-v2/app.js')
EDITOR = Path('operational-plan-pwa-v2/editor.js')
INDEX = Path('operational-plan-pwa-v2/index.html')
SW = Path('operational-plan-pwa-v2/sw.js')
BRIDGE = Path('operational-plan-pwa/print-bridge-v2.js')


def replace_once(text, old, new, label):
    if old in text:
        return text.replace(old, new, 1)
    if new in text:
        return text
    raise SystemExit(f'Marker not found: {label}')

# ---------------------------------------------------------------------------
# App: official 1448-1449 plan action + destructive plan deletion.
# ---------------------------------------------------------------------------
app = APP.read_text(encoding='utf-8')

old_actions = '<div class="card-actions"><button class="text-button" data-action="open-print">معاينة الطباعة</button><button class="text-button" data-editor-plan="${escapeHTML(p.id)}">تحرير الأسابيع</button></div>'
new_actions = '<div class="card-actions"><button class="text-button" data-action="open-print">معاينة الطباعة</button><button class="text-button" data-editor-plan="${escapeHTML(p.id)}">تحرير الأسابيع</button><button class="text-button" data-action="delete-plan" data-plan-id="${escapeHTML(p.id)}" style="color:#b91c1c">حذف الخطة</button></div>'
app = replace_once(app, old_actions, new_actions, 'plan card actions')

old_header_action = "'<button class=\"primary-button\" data-action=\"add-plan\">＋ خطة جديدة</button>'"
new_header_action = "'<div style=\"display:flex;gap:8px;flex-wrap:wrap\"><button class=\"secondary-button\" data-action=\"install-official-plan\">اعتماد تقويم 1448–1449</button><button class=\"primary-button\" data-action=\"add-plan\">＋ خطة جديدة</button></div>'"
app = replace_once(app, old_header_action, new_header_action, 'plans page official-calendar action')

app = replace_once(
    app,
    "document.querySelectorAll('[data-action]').forEach(btn => btn.addEventListener('click', () => handleAction(btn.dataset.action)));",
    "document.querySelectorAll('[data-action]').forEach(btn => btn.addEventListener('click', () => handleAction(btn.dataset.action, btn)));",
    'action target binding',
)
app = replace_once(app, '  function handleAction(action) {', '  function handleAction(action, target = null) {', 'handleAction signature')

old_cases = "    if (action === 'add-plan') openPlanDialog();\n    if (action === 'backup') exportBackup();"
new_cases = "    if (action === 'add-plan') openPlanDialog();\n    if (action === 'delete-plan') deletePlan(target?.dataset.planId);\n    if (action === 'install-official-plan') installOfficialPlan();\n    if (action === 'backup') exportBackup();"
app = replace_once(app, old_cases, new_cases, 'new plan actions')

functions_marker = '  function openSchoolDialog(id = null) {'
functions_block = '''  async function deletePlan(planId) {
    const plan = state.plans.find(item => item.id === planId);
    if (!plan) return;
    const accepted = confirm(`حذف «${plan.name}»؟\\nسيتم حذف أسابيع الخطة والأحداث المرتبطة بها نهائيًا.`);
    if (!accepted) return;

    const [weeks, events] = await Promise.all([
      PlanDB.getByIndex('weeks', 'planId', plan.id),
      PlanDB.getByIndex('events', 'planId', plan.id)
    ]);
    for (const week of weeks) await PlanDB.remove('weeks', week.id);
    for (const event of events) await PlanDB.remove('events', event.id);
    await PlanDB.remove('plans', plan.id);
    await refreshData();
    toast('تم حذف الخطة وجميع البيانات المرتبطة بها');
  }

  async function installOfficialPlan() {
    if (!state.activeSchool) { toast('اختر مدرسة أولًا'); return; }
    if (!window.OperationalAcademicCalendar) { toast('التقويم الرسمي غير متاح'); return; }
    const accepted = confirm('اعتماد التقويم الرسمي 1448–1449هـ لهذه المدرسة؟\\nسيتم ضبط الفترتين على 19 أسبوعًا دراسيًا لكل فترة وإضافة المواعيد الرسمية الثابتة. ستبقى ملاحظات ومحتوى الأسابيع الحالية قدر الإمكان.');
    if (!accepted) return;
    try {
      await window.OperationalAcademicCalendar.installForSchool(state.activeSchool, state.plans);
      await refreshData();
      state.view = 'plans';
      renderChrome();
      renderView();
      toast('تم اعتماد خطة 1448–1449هـ: 38 أسبوعًا دراسيًا');
    } catch (error) {
      toast(error.message || 'تعذر اعتماد التقويم الرسمي');
    }
  }

'''
if functions_block not in app:
    if functions_marker not in app:
        raise SystemExit('Marker not found: insert plan functions')
    app = app.replace(functions_marker, functions_block + functions_marker, 1)

APP.write_text(app, encoding='utf-8')

# ---------------------------------------------------------------------------
# Editor: Sunday-Thursday week shape, normalize legacy weekNumber, and make
# event cancellation an explicit non-submit action (important on iOS dialogs).
# ---------------------------------------------------------------------------
editor = EDITOR.read_text(encoding='utf-8')
editor = replace_once(
    editor,
    '        const endDate = startDate ? addDays(startDate, 6) : null;',
    '        const endDate = startDate ? addDays(startDate, 4) : null;',
    'school week end day',
)
editor = replace_once(
    editor,
    "          number: i + 1,\n          title: `الأسبوع ${i + 1}` ," if False else "          number: i + 1,\n          title: `الأسبوع ${i + 1}` ,",
    "          number: i + 1,\n          weekNumber: i + 1,\n          title: `الأسبوع ${i + 1}` ,",
    'weekNumber alias optional marker',
) if "          title: `الأسبوع ${i + 1}` ," in editor else editor

# Exact current source has no space before comma; handle it separately.
editor = replace_once(
    editor,
    "          number: i + 1,\n          title: `الأسبوع ${i + 1}`,",
    "          number: i + 1,\n          weekNumber: i + 1,\n          title: `الأسبوع ${i + 1}`,",
    'weekNumber alias',
)

old_sort = "    weeks.sort((a, b) => Number(a.number || 0) - Number(b.number || 0));\n    return weeks;"
new_sort = """    for (let index = 0; index < weeks.length; index += 1) {
      const week = weeks[index];
      const normalizedNumber = Number(week.number ?? week.weekNumber ?? index + 1);
      let changed = false;
      if (Number(week.number || 0) !== normalizedNumber) { week.number = normalizedNumber; changed = true; }
      if (Number(week.weekNumber || 0) !== normalizedNumber) { week.weekNumber = normalizedNumber; changed = true; }
      if (changed) await PlanDB.put('weeks', week);
    }
    weeks.sort((a, b) => Number(a.number ?? a.weekNumber ?? 0) - Number(b.number ?? b.weekNumber ?? 0));
    return weeks;"""
editor = replace_once(editor, old_sort, new_sort, 'legacy week number normalization')

editor = replace_once(
    editor,
    '<button class="icon-button" value="cancel" type="submit">×</button>',
    '<button class="icon-button" type="button" data-cancel-event aria-label="إلغاء">×</button>',
    'event dialog close button',
)
editor = replace_once(
    editor,
    '<button class="secondary-button" value="cancel" type="submit">إلغاء</button>',
    '<button class="secondary-button" type="button" data-cancel-event>إلغاء</button>',
    'event dialog cancel button',
)

show_marker = "    dialog.showModal();\n\n    $('[data-save-event]', dialog).addEventListener('click', async () => {"
show_replacement = """    dialog.showModal();

    $$('[data-cancel-event]', dialog).forEach(button => button.addEventListener('click', () => {
      dialog.close('cancel');
    }));

    $('[data-save-event]', dialog).addEventListener('click', async () => {"""
editor = replace_once(editor, show_marker, show_replacement, 'cancel event handler')
EDITOR.write_text(editor, encoding='utf-8')

# ---------------------------------------------------------------------------
# PWA shell: load/cache the official calendar data module.
# ---------------------------------------------------------------------------
index = INDEX.read_text(encoding='utf-8')
index = replace_once(
    index,
    '  <script src="./db.js"></script>\n  <script src="./setup-wizard.js"></script>',
    '  <script src="./db.js"></script>\n  <script src="./academic-calendar.js"></script>\n  <script src="./setup-wizard.js"></script>',
    'academic calendar script load',
)
INDEX.write_text(index, encoding='utf-8')

sw = SW.read_text(encoding='utf-8')
sw = sw.replace("operational-plan-pwa-v2-shell-5", "operational-plan-pwa-v2-shell-6", 1)
if "'./academic-calendar.js'" not in sw:
    sw = sw.replace("  './db.js',", "  './db.js',\n  './academic-calendar.js',", 1)
SW.write_text(sw, encoding='utf-8')

# ---------------------------------------------------------------------------
# Frozen print template bridge only: never rewrite ordinary day rows. Keeping
# the DOM row untouched preserves the approved ✓/X operational pattern.
# Also map instructional weeks sequentially so full-week vacation cards do not
# consume an instructional week number.
# ---------------------------------------------------------------------------
bridge = BRIDGE.read_text(encoding='utf-8')
old_else = """      } else {
        row.innerHTML = `<td>${DAY_NAMES[dayIndex] || ''}</td><td class=\"font-bold text-emerald-700 clickable-status\">✓</td>`;
      }"""
new_else = """      } else {
        // Preserve the approved operational-plan status already present in
        // the frozen template (✓ / X). Do not replace all days with ✓.
      }"""
bridge = replace_once(bridge, old_else, new_else, 'preserve day status marks')

old_apply_period = """  function applyPeriod(plan, period) {
    const cards = [...document.querySelectorAll(`.week-card[data-period=\"${period}\"]`)]
      .sort((a, b) => Number(a.dataset.weekIndex || 0) - Number(b.dataset.weekIndex || 0));

    if (!plan) {
      cards.forEach(clearCard);
      return;
    }

    const weeks = [...(plan.weeks || [])].sort((a, b) => Number(a.number ?? a.weekNumber ?? 0) - Number(b.number ?? b.weekNumber ?? 0));
    const events = plan.events || [];
    cards.forEach(card => {
      const index = Number(card.dataset.weekIndex || 0);
      const week = weeks[index];
      if (!week) {
        clearCard(card);
        return;
      }
      if (card.classList.contains('week-card-standard')) applyStandardCard(card, week, events, index);
      else applySpecialCard(card, week, events, index);
    });
  }"""
new_apply_period = """  function specialHolidayForCard(card, events) {
    const id = card.id || '';
    const hint = id === 'vacation-card-p1' ? 'الخريف'
      : id === 'vacation-card-eid1' ? 'الفطر'
      : id === 'vacation-card-eid2' ? 'الأضحى'
      : '';
    if (!hint) return null;
    return (events || []).find(event => event.type === 'holiday' && String(event.title || '').includes(hint)) || null;
  }

  function applyPeriod(plan, period) {
    const cards = [...document.querySelectorAll(`.week-card[data-period=\"${period}\"]`)]
      .sort((a, b) => Number(a.dataset.weekIndex || 0) - Number(b.dataset.weekIndex || 0));

    if (!plan) {
      cards.forEach(clearCard);
      return;
    }

    const weeks = [...(plan.weeks || [])].sort((a, b) => Number(a.number ?? a.weekNumber ?? 0) - Number(b.number ?? b.weekNumber ?? 0));
    const events = plan.events || [];
    let instructionalIndex = 0;

    cards.forEach(card => {
      if (!card.classList.contains('week-card-standard')) {
        const holiday = specialHolidayForCard(card, events);
        if (holiday) {
          applySpecialCard(card, {
            startDate: holiday.startDate,
            endDate: holiday.endDate || holiday.startDate,
            title: holiday.title
          }, events, instructionalIndex);
        } else {
          clearCard(card);
        }
        return;
      }

      const week = weeks[instructionalIndex];
      if (!week) {
        clearCard(card);
        return;
      }
      applyStandardCard(card, week, events, instructionalIndex);
      instructionalIndex += 1;
    });
  }"""
bridge = replace_once(bridge, old_apply_period, new_apply_period, 'sequential instructional week mapping')
BRIDGE.write_text(bridge, encoding='utf-8')

print('Applied official-calendar, plan deletion, event cancel, and print-status fixes without changing print CSS.')
