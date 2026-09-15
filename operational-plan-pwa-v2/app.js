(() => {
  const state = { view: 'dashboard', settings: null, schools: [], plans: [], activeSchool: null, installPrompt: null };
  const $ = id => document.getElementById(id);
  const typeLabel = { complex: 'مجمع', primary: 'ابتدائي', middle: 'متوسط', secondary: 'ثانوي', other: 'أخرى' };

  function escapeHTML(value = '') {
    return String(value).replace(/[&<>'"]/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;' }[c]));
  }

  function toast(message) {
    const node = document.createElement('div');
    node.className = 'toast';
    node.textContent = message;
    document.body.appendChild(node);
    setTimeout(() => node.remove(), 2600);
  }

  async function refreshData() {
    state.settings = await PlanDB.get('settings', 'app-settings');
    state.schools = (await PlanDB.getAll('schools')).filter(s => !s.isArchived);
    state.activeSchool = state.schools.find(s => s.id === state.settings?.activeSchoolId) || state.schools[0] || null;
    if (state.activeSchool && state.settings?.activeSchoolId !== state.activeSchool.id) {
      state.settings.activeSchoolId = state.activeSchool.id;
      await PlanDB.put('settings', state.settings);
    }
    state.plans = state.activeSchool ? await PlanDB.getByIndex('plans', 'schoolId', state.activeSchool.id) : [];
    renderChrome();
    renderView();
  }

  function renderChrome() {
    $('activeSchoolName').textContent = state.activeSchool?.shortName || state.activeSchool?.name || 'لا توجد مدرسة';
    const menu = $('schoolMenu');
    menu.innerHTML = state.schools.map(s => `
      <button type="button" class="${s.id === state.activeSchool?.id ? 'is-active' : ''}" data-school-id="${s.id}">
        <strong>${escapeHTML(s.shortName || s.name)}</strong><br><small>${escapeHTML(s.educationRegion || 'بدون منطقة')}</small>
      </button>`).join('') + `<button type="button" data-add-school><strong>＋ إضافة مدرسة جديدة</strong></button>`;
    menu.querySelectorAll('[data-school-id]').forEach(btn => btn.addEventListener('click', () => setActiveSchool(btn.dataset.schoolId)));
    menu.querySelector('[data-add-school]')?.addEventListener('click', () => { menu.hidden = true; openSchoolDialog(); });

    document.querySelectorAll('[data-view]').forEach(btn => btn.classList.toggle('is-active', btn.dataset.view === state.view));
  }

  async function setActiveSchool(id) {
    state.settings.activeSchoolId = id;
    await PlanDB.put('settings', state.settings);
    $('schoolMenu').hidden = true;
    await refreshData();
    toast('تم تغيير المدرسة النشطة');
  }

  function setView(view) {
    state.view = view;
    renderChrome();
    renderView();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function renderView() {
    const root = $('viewRoot');
    if (state.view === 'dashboard') root.innerHTML = dashboardView();
    if (state.view === 'schools') root.innerHTML = schoolsView();
    if (state.view === 'plans') root.innerHTML = plansView();
    if (state.view === 'calendar') { root.innerHTML = calendarView(); setTimeout(() => window.PlanEditor?.openCalendar(state.activeSchool, state.plans), 0); }
    if (state.view === 'print') root.innerHTML = printView();
    if (state.view === 'settings') root.innerHTML = settingsView();
    bindViewActions();
  }

  function pageHead(title, text, action = '') {
    return `<div class="page-head"><div><h1>${title}</h1><p>${text}</p></div>${action}</div>`;
  }

  function dashboardView() {
    const school = state.activeSchool;
    if (!school) return emptySchools();
    const activePlans = state.plans.filter(p => p.status !== 'archived');
    const weeks = activePlans.reduce((sum, p) => sum + Number(p.weeksCount || 0), 0);
    return `
      ${pageHead('الرئيسية', 'نظرة سريعة على المدرسة والخطط الحالية')}
      <section class="hero">
        <div>
          <span class="eyebrow" style="color:#bfe0dc">المدرسة النشطة</span>
          <h2>${escapeHTML(school.name)}</h2>
          <p>${escapeHTML(typeLabel[school.schoolType] || 'مدرسة')} · ${escapeHTML(school.educationRegion || 'لم تحدد المنطقة')} ${school.educationOffice ? '· ' + escapeHTML(school.educationOffice) : ''}</p>
          <div class="hero-actions">
            <button class="primary-button" data-action="open-plans">فتح الخطط</button>
            <button class="secondary-button" data-action="open-print">معاينة الطباعة</button>
          </div>
        </div>
        <div class="hero-summary"><div><span>الخطة الحالية</span><strong>${activePlans[0] ? escapeHTML(activePlans[0].academicYear) : '—'}</strong></div><span>${activePlans[0] ? escapeHTML(activePlans[0].name) : 'لا توجد خطة بعد'}</span></div>
      </section>
      <section class="stats-grid">
        <article class="stat-card"><small>الخطط</small><strong>${activePlans.length}</strong></article>
        <article class="stat-card"><small>إجمالي الأسابيع</small><strong>${weeks || 0}</strong></article>
        <article class="stat-card"><small>المدارس المحفوظة</small><strong>${state.schools.length}</strong></article>
        <article class="stat-card"><small>حالة البيانات</small><strong style="font-size:16px;color:var(--brand)">محفوظة محليًا</strong></article>
      </section>
      <section class="content-grid">
        <article class="card"><h3>إجراءات سريعة</h3><div class="quick-grid">
          <button class="quick-action" data-action="add-plan"><strong>＋ خطة جديدة</strong><span>إنشاء خطة لهذه المدرسة</span></button>
          <button class="quick-action" data-action="add-school"><strong>＋ مدرسة جديدة</strong><span>إضافة ملف مدرسة مستقل</span></button>
          <button class="quick-action" data-action="open-calendar"><strong>◫ التقويم</strong><span>الإجازات والمناسبات</span></button>
          <button class="quick-action" data-action="backup"><strong>⇩ نسخة احتياطية</strong><span>تصدير جميع المدارس والخطط</span></button>
        </div></article>
        <article class="card"><h3>حالة النظام</h3><div class="timeline">
          <div class="timeline-row"><div class="timeline-icon">✓</div><div><strong>قالب الطباعة محمي</strong><span>واجهة v2 لا تعدّل CSS الخاص بالطباعة</span></div></div>
          <div class="timeline-row"><div class="timeline-icon">DB</div><div><strong>IndexedDB مفعّل</strong><span>كل مدرسة تحتفظ ببياناتها بشكل مستقل</span></div></div>
          <div class="timeline-row"><div class="timeline-icon">P</div><div><strong>PWA جاهز</strong><span>قابل للتثبيت والعمل دون اتصال</span></div></div>
        </div></article>
      </section>`;
  }

  function emptySchools() {
    return `${pageHead('الرئيسية','ابدأ بإنشاء ملف مدرسة')}
      <div class="empty-state"><div class="big-icon">🏫</div><h3>لا توجد مدرسة بعد</h3><p>أنشئ المدرسة الأولى، ثم أضف الخطط والتقويم.</p><button class="primary-button" data-action="add-school">إنشاء مدرسة</button></div>`;
  }

  function schoolsView() {
    return `${pageHead('المدارس','إدارة أكثر من مدرسة والتبديل بينها', '<button class="primary-button" data-action="add-school">＋ إضافة مدرسة</button>')}
      <div class="school-grid">${state.schools.map(s => `<article class="school-card ${s.id === state.activeSchool?.id ? 'is-active' : ''}">
        <div class="school-avatar">🏫</div><span class="badge">${escapeHTML(typeLabel[s.schoolType] || 'مدرسة')}</span>
        <h3>${escapeHTML(s.name)}</h3><p>${escapeHTML(s.educationRegion || 'لم تحدد المنطقة')} ${s.educationOffice ? '· ' + escapeHTML(s.educationOffice) : ''}</p>
        <div class="card-actions">${s.id !== state.activeSchool?.id ? `<button class="text-button" data-set-school="${s.id}">اجعلها نشطة</button>` : '<span class="badge">نشطة الآن</span>'}<button class="text-button" data-edit-school="${s.id}">تعديل</button></div>
      </article>`).join('')}</div>`;
  }

  function plansView() {
    const cards = state.plans.length ? state.plans.map(p => `<article class="plan-card"><span class="badge">${p.term === '2' ? 'الفترة الثانية' : 'الفترة الأولى'}</span><h3>${escapeHTML(p.name)}</h3><p>${escapeHTML(p.academicYear || '')} · ${Number(p.weeksCount || 0)} أسبوع</p><div class="card-actions"><button class="text-button" data-action="open-print">معاينة الطباعة</button><button class="text-button" data-editor-plan="${escapeHTML(p.id)}">تحرير الأسابيع</button></div></article>`).join('') : `<div class="empty-state"><div class="big-icon">▦</div><h3>لا توجد خطط لهذه المدرسة</h3><p>أنشئ أول خطة ثم سيظهر محرر الأسابيع هنا.</p><button class="primary-button" data-action="add-plan">إنشاء خطة</button></div>`;
    return `${pageHead('الخطط', state.activeSchool ? `خطط ${escapeHTML(state.activeSchool.shortName || state.activeSchool.name)}` : 'اختر مدرسة أولًا', '<button class="primary-button" data-action="add-plan">＋ خطة جديدة</button>')}<div class="plan-grid">${cards}</div>`;
  }

  function calendarView() {
    return `${pageHead('التقويم','الإجازات والمناسبات المرتبطة بالخطط')}
      <article class="card"><div class="notice">في هذه المرحلة ربطنا شاشة التقويم بنموذج البيانات. محرر الإجازات والمناسبات هو المرحلة التالية؛ ولن تُكتب الإجازات داخل كود الطباعة بعد الآن.</div>
      <div class="timeline" style="margin-top:18px"><div class="timeline-row"><div class="timeline-icon">1</div><div><strong>إضافة حدث</strong><span>إجازة، مناسبة، اختبار أو ملاحظة.</span></div></div><div class="timeline-row"><div class="timeline-icon">2</div><div><strong>ربطه بالخطة</strong><span>يظهر تلقائيًا داخل الأسبوع المناسب.</span></div></div><div class="timeline-row"><div class="timeline-icon">3</div><div><strong>إرساله للطباعة</strong><span>البيانات تتغير والقالب يبقى ثابتًا.</span></div></div></div></article>`;
  }

  function printView() {
    return `${pageHead('الطباعة','محرك الطباعة المعتمد مستقل عن واجهة الإدارة')}
      <article class="card print-preview-card"><div class="paper-preview"><div></div><div></div>${'<div></div>'.repeat(14)}</div><div><span class="badge">Print Engine v1 — ثابت</span><h3 style="font-size:20px;margin:10px 0 6px">القالب الرسمي المعتمد</h3><p style="color:var(--muted);font-size:12px">لن نغيّر قياسات A4 أو إعدادات طباعة الكمبيوتر والآيفون من واجهة v2. الربط الكامل لبيانات المدرسة النشطة بالقالب سيكون في المرحلة التالية.</p><div class="card-actions" style="margin-top:16px"><button class="primary-button" data-action="launch-print">فتح قالب الطباعة الحالي</button></div></div></article>`;
  }

  function settingsView() {
    return `${pageHead('الإعدادات','إعدادات التطبيق والبيانات')}
      <div class="settings-list">
        <div class="settings-row"><div><strong>نسخة احتياطية</strong><span>تصدير المدارس والخطط والإعدادات إلى ملف JSON.</span></div><button class="secondary-button" data-action="backup">تصدير</button></div>
        <div class="settings-row"><div><strong>استعادة نسخة</strong><span>استيراد ملف صادر من هذا التطبيق.</span></div><button class="secondary-button" data-action="restore">استيراد</button></div>
        <div class="settings-row"><div><strong>تثبيت التطبيق</strong><span>على الآيفون: مشاركة ← إضافة إلى الشاشة الرئيسية.</span></div><button class="secondary-button" data-action="install">تثبيت</button></div>
        <div class="settings-row"><div><strong>قالب الطباعة</strong><span>محمي ومعزول عن تغييرات واجهة v2.</span></div><span class="badge">ثابت</span></div>
      </div>`;
  }

  function bindViewActions() {
    document.querySelectorAll('[data-action]').forEach(btn => btn.addEventListener('click', () => handleAction(btn.dataset.action)));
    document.querySelectorAll('[data-set-school]').forEach(btn => btn.addEventListener('click', () => setActiveSchool(btn.dataset.setSchool)));
    document.querySelectorAll('[data-edit-school]').forEach(btn => btn.addEventListener('click', () => openSchoolDialog(btn.dataset.editSchool)));
    window.PlanEditor?.bindPlanButtons($('viewRoot'), state.activeSchool, state.plans);
  }

  function handleAction(action) {
    if (action === 'open-plans') setView('plans');
    if (action === 'open-calendar') setView('calendar');
    if (action === 'open-print') setView('print');
    if (action === 'add-school') openSchoolDialog();
    if (action === 'add-plan') openPlanDialog();
    if (action === 'backup') exportBackup();
    if (action === 'restore') $('backupFile').click();
    if (action === 'install') installApp();
    if (action === 'launch-print') window.open('../operational-plan-pwa/index.html', '_blank', 'noopener');
  }

  function openSchoolDialog(id = null) {
    const school = state.schools.find(s => s.id === id);
    $('schoolDialogTitle').textContent = school ? 'تعديل المدرسة' : 'إضافة مدرسة';
    $('schoolId').value = school?.id || '';
    $('schoolName').value = school?.name || '';
    $('schoolShortName').value = school?.shortName || '';
    $('schoolType').value = school?.schoolType || 'complex';
    $('schoolRegion').value = school?.educationRegion || '';
    $('schoolOffice').value = school?.educationOffice || '';
    $('schoolDialog').showModal();
  }

  async function saveSchool() {
    const name = $('schoolName').value.trim();
    if (!name) { toast('أدخل اسم المدرسة'); return; }
    const existingId = $('schoolId').value;
    const existing = existingId ? state.schools.find(s => s.id === existingId) : null;
    const school = {
      id: existingId || PlanDB.id('school'),
      name,
      shortName: $('schoolShortName').value.trim() || name,
      schoolType: $('schoolType').value,
      educationRegion: $('schoolRegion').value.trim(),
      educationOffice: $('schoolOffice').value.trim(),
      isArchived: false,
      createdAt: existing?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    await PlanDB.put('schools', school);
    if (!state.settings.activeSchoolId) {
      state.settings.activeSchoolId = school.id;
      await PlanDB.put('settings', state.settings);
    }
    $('schoolDialog').close();
    await refreshData();
    toast(existing ? 'تم تحديث بيانات المدرسة' : 'تمت إضافة المدرسة');
  }

  function openPlanDialog() {
    if (!state.activeSchool) { toast('أضف مدرسة أولًا'); return; }
    $('planDialog').showModal();
  }

  async function savePlan() {
    const name = $('planName').value.trim();
    if (!name) { toast('أدخل اسم الخطة'); return; }
    const plan = {
      id: PlanDB.id('plan'), schoolId: state.activeSchool.id, name,
      academicYear: $('planYear').value.trim(), term: $('planTerm').value,
      weeksCount: Number($('planWeeks').value || 19), startDate: $('planStart').value || null,
      status: 'active', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
    };
    await PlanDB.put('plans', plan);
    await window.PlanEditor?.ensureWeeks(plan);
    $('planDialog').close();
    await refreshData();
    setView('plans');
    toast('تم إنشاء الخطة');
  }

  async function exportBackup() {
    const payload = await PlanDB.exportAll();
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `operational-plan-backup-${new Date().toISOString().slice(0,10)}.json`;
    a.click(); URL.revokeObjectURL(url);
    toast('تم تصدير النسخة الاحتياطية');
  }

  async function importBackup(file) {
    try {
      const payload = JSON.parse(await file.text());
      await PlanDB.importAll(payload);
      await refreshData();
      toast('تمت استعادة النسخة الاحتياطية');
    } catch (error) { toast(error.message || 'تعذر استيراد الملف'); }
  }

  async function installApp() {
    if (state.installPrompt) {
      state.installPrompt.prompt();
      await state.installPrompt.userChoice;
      state.installPrompt = null;
      $('installBtn').hidden = true;
    } else {
      toast('على الآيفون: مشاركة ← إضافة إلى الشاشة الرئيسية');
    }
  }

  function bindGlobal() {
    document.querySelectorAll('[data-view]').forEach(btn => btn.addEventListener('click', () => setView(btn.dataset.view)));
    $('schoolSwitcher').addEventListener('click', () => $('schoolMenu').hidden = !$('schoolMenu').hidden);
    $('addSchoolTopBtn').addEventListener('click', () => openSchoolDialog());
    $('saveSchoolBtn').addEventListener('click', saveSchool);
    $('savePlanBtn').addEventListener('click', savePlan);
    $('backupFile').addEventListener('change', e => { const file = e.target.files?.[0]; if (file) importBackup(file); e.target.value = ''; });
    $('installBtn').addEventListener('click', installApp);
    document.addEventListener('click', e => { if (!e.target.closest('.topbar-title')) $('schoolMenu').hidden = true; });
    window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); state.installPrompt = e; $('installBtn').hidden = false; });
  }

  async function boot() {
    bindGlobal();
    await PlanDB.ensureSeed();
    await refreshData();
    if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(console.warn);
  }

  boot().catch(error => {
    console.error(error);
    $('viewRoot').innerHTML = `<div class="empty-state"><h3>تعذر تشغيل التطبيق</h3><p>${escapeHTML(error.message || 'خطأ غير معروف')}</p></div>`;
  });
})();
