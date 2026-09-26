(() => {
  const APP_VERSION = globalThis.APP_VERSION || '2.1.0';
  let swRegistration = null;
  let updateReloading = false;
  let updateBannerTimer = null;
  let updateSplashActive = false;
  let updateTargetVersion = '';
  let updateProgressEligible = false;
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
    const cards = state.plans.length ? state.plans.map(p => `<article class="plan-card"><span class="badge">${p.term === '2' ? 'الفترة الثانية' : 'الفترة الأولى'}</span><h3>${escapeHTML(p.name)}</h3><p>${escapeHTML(p.academicYear || '')} · ${Number(p.weeksCount || 0)} أسبوع</p><div class="card-actions"><button class="text-button" data-action="open-print">معاينة الطباعة</button><button class="text-button" data-editor-plan="${escapeHTML(p.id)}">تحرير الأسابيع</button><button class="text-button" data-action="delete-plan" data-plan-id="${escapeHTML(p.id)}" style="color:#b91c1c">حذف الخطة</button></div></article>`).join('') : `<div class="empty-state"><div class="big-icon">▦</div><h3>لا توجد خطط لهذه المدرسة</h3><p>أنشئ أول خطة ثم سيظهر محرر الأسابيع هنا.</p><button class="primary-button" data-action="add-plan">إنشاء خطة</button></div>`;
    return `${pageHead('الخطط', state.activeSchool ? `خطط ${escapeHTML(state.activeSchool.shortName || state.activeSchool.name)}` : 'اختر مدرسة أولًا', '<div style="display:flex;gap:8px;flex-wrap:wrap"><button class="secondary-button" data-action="install-official-plan">اعتماد تقويم 1448–1449</button><button class="primary-button" data-action="add-plan">＋ خطة جديدة</button></div>')}<div class="plan-grid">${cards}</div>`;
  }

  function calendarView() {
    return `${pageHead('التقويم','الإجازات والمناسبات المرتبطة بالخطط')}
      <article class="card"><div class="notice">في هذه المرحلة ربطنا شاشة التقويم بنموذج البيانات. محرر الإجازات والمناسبات هو المرحلة التالية؛ ولن تُكتب الإجازات داخل كود الطباعة بعد الآن.</div>
      <div class="timeline" style="margin-top:18px"><div class="timeline-row"><div class="timeline-icon">1</div><div><strong>إضافة حدث</strong><span>إجازة، مناسبة، اختبار أو ملاحظة.</span></div></div><div class="timeline-row"><div class="timeline-icon">2</div><div><strong>ربطه بالخطة</strong><span>يظهر تلقائيًا داخل الأسبوع المناسب.</span></div></div><div class="timeline-row"><div class="timeline-icon">3</div><div><strong>إرساله للطباعة</strong><span>البيانات تتغير والقالب يبقى ثابتًا.</span></div></div></div></article>`;
  }

  function printView() {
    return `${pageHead('الطباعة','محرك الطباعة المعتمد مستقل عن واجهة الإدارة')}
      <article class="card print-preview-card"><div class="paper-preview"><div></div><div></div>${'<div></div>'.repeat(14)}</div><div><span class="badge">Print Engine v1 — ثابت</span><h3 style="font-size:20px;margin:10px 0 6px">القالب الرسمي المعتمد</h3><p style="color:var(--muted);font-size:12px">يتم تمرير بيانات المدرسة والخطط والأسابيع والإجازات والمسؤولين إلى القالب الرسمي دون تغيير قياسات A4 أو تنسيق طباعة الكمبيوتر والآيفون.</p><div class="card-actions" style="margin-top:16px"><button class="primary-button" data-action="launch-print">فتح قالب الطباعة الحالي</button></div></div></article>`;
  }

  function settingsView() {
    return `${pageHead('الإعدادات','إعدادات التطبيق والبيانات')}
      <div class="settings-list">
        <div class="settings-row"><div><strong>نسخة احتياطية</strong><span>تصدير المدارس والخطط والإعدادات إلى ملف JSON.</span></div><button class="secondary-button" data-action="backup">تصدير</button></div>
        <div class="settings-row"><div><strong>استعادة نسخة</strong><span>استيراد ملف صادر من هذا التطبيق.</span></div><button class="secondary-button" data-action="restore">استيراد</button></div>
        <div class="settings-row"><div><strong>تثبيت التطبيق</strong><span>على الآيفون: مشاركة ← إضافة إلى الشاشة الرئيسية.</span></div><button class="secondary-button" data-action="install">تثبيت</button></div>
        <div class="settings-row"><div><strong>تحديث التطبيق</strong><span>الإصدار الحالي v${escapeHTML(APP_VERSION)} · يتم الفحص تلقائيًا عند فتح التطبيق وعودة الاتصال.</span></div><button class="secondary-button" data-action="check-update">فحص الآن</button></div>
        <div class="settings-row"><div><strong>قالب الطباعة</strong><span>محمي ومعزول عن تغييرات واجهة v2.</span></div><span class="badge">ثابت</span></div>
      </div>`;
  }

  function bindViewActions() {
    document.querySelectorAll('[data-action]').forEach(btn => btn.addEventListener('click', () => handleAction(btn.dataset.action, btn)));
    document.querySelectorAll('[data-set-school]').forEach(btn => btn.addEventListener('click', () => setActiveSchool(btn.dataset.setSchool)));
    document.querySelectorAll('[data-edit-school]').forEach(btn => btn.addEventListener('click', () => openSchoolDialog(btn.dataset.editSchool)));
    window.PlanEditor?.bindPlanButtons($('viewRoot'), state.activeSchool, state.plans);
  }

  function handleAction(action, target = null) {
    if (action === 'open-plans') setView('plans');
    if (action === 'open-calendar') setView('calendar');
    if (action === 'open-print') setView('print');
    if (action === 'add-school') openSchoolDialog();
    if (action === 'add-plan') openPlanDialog();
    if (action === 'delete-plan') deletePlan(target?.dataset.planId);
    if (action === 'install-official-plan') installOfficialPlan();
    if (action === 'backup') exportBackup();
    if (action === 'restore') $('backupFile').click();
    if (action === 'install') installApp();
    if (action === 'check-update') checkForAppUpdate({ manual: true });
    if (action === 'launch-print') {
      if (!window.PrintAdapter) { toast('محول الطباعة غير متاح'); return; }
      window.PrintAdapter.openSchoolPrint(state.activeSchool, state.plans)
        .catch(error => toast(error.message || 'تعذر تجهيز الطباعة'));
    }
  }

  async function deletePlan(planId) {
    const plan = state.plans.find(item => item.id === planId);
    if (!plan) return;
    const accepted = confirm(`حذف «${plan.name}»؟\nسيتم حذف أسابيع الخطة والأحداث المرتبطة بها نهائيًا.`);
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
    const accepted = confirm('اعتماد التقويم الرسمي 1448–1449هـ لهذه المدرسة؟\nسيتم ضبط الفترة الأولى على 19 أسبوعًا والفترة الثانية على 18 أسبوعًا، وإضافة المواعيد الثابتة وإجازات جازان الإضافية. ستبقى ملاحظات ومحتوى الأسابيع الحالية قدر الإمكان.');
    if (!accepted) return;
    try {
      await window.OperationalAcademicCalendar.installForSchool(state.activeSchool, state.plans);
      await refreshData();
      state.view = 'plans';
      renderChrome();
      renderView();
      toast('تم اعتماد خطة 1448–1449هـ: 37 أسبوعًا تشغيليًا (19 + 18)');
    } catch (error) {
      toast(error.message || 'تعذر اعتماد التقويم الرسمي');
    }
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


  function compareVersions(a = '0', b = '0') {
    const pa = String(a).split('.').map(x => Number(x) || 0);
    const pb = String(b).split('.').map(x => Number(x) || 0);
    const n = Math.max(pa.length, pb.length);
    for (let i = 0; i < n; i += 1) {
      const diff = (pa[i] || 0) - (pb[i] || 0);
      if (diff) return diff > 0 ? 1 : -1;
    }
    return 0;
  }

  function setVersionUI() {
    const versionNode = $('appVersion');
    if (versionNode) versionNode.textContent = 'الإصدار v' + APP_VERSION;
  }

  function showUpdateBanner(title, message, autoHide = 0) {
    const banner = $('updateBanner');
    if (!banner) return;
    $('updateBannerTitle').textContent = title;
    $('updateBannerText').textContent = message;
    banner.hidden = false;
    if (updateBannerTimer) clearTimeout(updateBannerTimer);
    if (autoHide) updateBannerTimer = setTimeout(() => { banner.hidden = true; }, autoHide);
  }

  function updateAssetLabel(asset = '') {
    const clean = String(asset).replace(/^\.\//, '');
    const labels = {
      '': 'واجهة التطبيق',
      'index.html': 'واجهة التطبيق',
      'app.js': 'وظائف التطبيق',
      'app.css': 'تصميم التطبيق',
      'setup-wizard.js': 'معالج الإعداد',
      'setup-wizard.css': 'تصميم معالج الإعداد',
      'editor.js': 'محرر الخطط',
      'editor.css': 'تصميم المحرر',
      'db.js': 'طبقة البيانات',
      'academic-calendar.js': 'التقويم الدراسي',
      'print-adapter.js': 'محول الطباعة',
      'version.js': 'بيانات الإصدار',
      'manifest.webmanifest': 'إعدادات PWA',
      'Cairo.ttf': 'الخط العربي'
    };
    const name = clean.split('/').pop() || '';
    return labels[clean] || labels[name] || name || 'ملفات التطبيق';
  }

  function showUpdateSplash({ version = '', title = 'جارٍ تحديث التطبيق', status = 'يتم تجهيز الإصدار الجديد…', progress = 0, detail = '' } = {}) {
    const splash = $('updateSplash');
    if (!splash) {
      showUpdateBanner(title, status);
      return;
    }
    updateSplashActive = true;
    if (version) updateTargetVersion = version;
    const value = Math.max(0, Math.min(100, Number(progress) || 0));
    splash.hidden = false;
    document.body.classList.add('update-in-progress');
    $('updateSplashTitle').textContent = title;
    $('updateSplashStatus').textContent = status;
    $('updateSplashVersion').textContent = updateTargetVersion ? 'v' + updateTargetVersion : '—';
    $('updateSplashProgress').style.width = value + '%';
    $('updateSplashPercent').textContent = Math.round(value).toLocaleString('ar-SA') + '٪';
    $('updateSplashDetail').textContent = detail || 'جارٍ تجهيز ملفات التحديث…';
  }

  function updateSplashFromWorker(data = {}) {
    const phase = data.phase || '';
    const raw = Math.max(0, Math.min(100, Number(data.progress) || 0));
    const version = data.version || updateTargetVersion;
    if (phase === 'start') {
      showUpdateSplash({ version, title: 'تم العثور على تحديث', status: 'جارٍ تجهيز ملفات الإصدار الجديد…', progress: 8, detail: 'بدء تنزيل ملفات التطبيق' });
      return;
    }
    if (phase === 'downloading') {
      const mapped = 10 + raw * 0.76;
      const current = Number(data.completed || 0) + 1;
      const total = Number(data.total || 0);
      const count = total ? ' · ' + Math.min(current, total).toLocaleString('ar-SA') + ' / ' + total.toLocaleString('ar-SA') : '';
      showUpdateSplash({ version, title: 'جارٍ تنزيل التحديث', status: 'يتم تنزيل ملفات الإصدار الجديد بأمان…', progress: mapped, detail: updateAssetLabel(data.asset) + count });
      return;
    }
    if (phase === 'installed') {
      showUpdateSplash({ version, title: 'اكتمل التنزيل', status: 'جارٍ تثبيت التحديث…', progress: 90, detail: 'تم تنزيل جميع ملفات التطبيق' });
      return;
    }
    if (phase === 'activating') {
      showUpdateSplash({ version, title: 'جارٍ تفعيل الإصدار', status: 'يتم استبدال ملفات التطبيق القديمة…', progress: 96, detail: 'تهيئة النسخة الجديدة' });
      return;
    }
    if (phase === 'activated') {
      showUpdateSplash({ version, title: 'اكتمل التحديث', status: 'سيُعاد فتح التطبيق على الإصدار الجديد.', progress: 100, detail: 'تم تثبيت التحديث بنجاح' });
      return;
    }
    if (phase === 'error') {
      showUpdateSplash({ version, title: 'تعذر إكمال التحديث', status: 'احتفظ التطبيق بالإصدار الحالي، وسيعاد الفحص عند توفر اتصال مستقر.', progress: raw || 10, detail: data.asset ? updateAssetLabel(data.asset) : 'خطأ أثناء تنزيل الملفات' });
    }
  }

  async function fetchPublishedVersion() {
    try {
      const response = await fetch('./version.js?check=' + Date.now(), { cache: 'no-store', headers: { 'cache-control': 'no-cache' } });
      if (!response.ok) return null;
      const text = await response.text();
      const match = text.match(/APP_VERSION\s*=\s*['"]([^'"]+)['"]/);
      return match?.[1] || null;
    } catch (_) {
      return null;
    }
  }

  async function checkForAppUpdate({ manual = false } = {}) {
    if (!navigator.onLine) {
      if (manual) showUpdateBanner('لا يوجد اتصال', 'سيتم فحص التحديث عند عودة الاتصال.', 2600);
      return;
    }
    if (manual) showUpdateBanner('فحص التحديثات', 'جارٍ التحقق من أحدث إصدار…');
    const latest = await fetchPublishedVersion();
    const newer = latest && compareVersions(latest, APP_VERSION) > 0;
    if (newer) {
      updateTargetVersion = latest;
      updateProgressEligible = true;
      showUpdateSplash({ version: latest, title: 'يوجد إصدار جديد', status: 'جارٍ بدء التحديث تلقائيًا…', progress: 5, detail: 'التحقق من ملفات الإصدار v' + latest });
    }
    try { await swRegistration?.update(); } catch (_) {}
    if (swRegistration?.waiting) {
      try { swRegistration.waiting.postMessage({ type: 'SKIP_WAITING' }); } catch (_) {}
    }
    if (manual && !newer) showUpdateBanner('التطبيق محدث', 'أنت تستخدم أحدث إصدار v' + APP_VERSION + '.', 2400);
  }

  async function initAppUpdater() {
    setVersionUI();
    try {
      const key = 'operational-plan-app-version';
      const previous = localStorage.getItem(key);
      if (previous && previous !== APP_VERSION) setTimeout(() => toast('تم تحديث التطبيق إلى الإصدار v' + APP_VERSION), 500);
      localStorage.setItem(key, APP_VERSION);
    } catch (_) {}
    if (!('serviceWorker' in navigator)) return;

    const hadController = Boolean(navigator.serviceWorker.controller);
    updateProgressEligible = hadController;

    try {
      navigator.serviceWorker.addEventListener('message', event => {
        const data = event.data || {};
        if (data.type !== 'UPDATE_PROGRESS') return;
        if (!updateProgressEligible && !updateSplashActive) return;
        updateProgressEligible = true;
        updateSplashFromWorker(data);
      });

      swRegistration = await navigator.serviceWorker.register('./sw.js', { updateViaCache: 'none' });

      swRegistration.addEventListener('updatefound', () => {
        const worker = swRegistration.installing;
        if (!worker || !navigator.serviceWorker.controller) return;
        updateProgressEligible = true;
        showUpdateSplash({ version: updateTargetVersion, title: 'يوجد تحديث جديد', status: 'جارٍ تجهيز الإصدار الجديد…', progress: 7, detail: 'بدء تثبيت مكونات التحديث' });
        worker.addEventListener('statechange', () => {
          if (worker.state === 'installed') {
            showUpdateSplash({ version: updateTargetVersion, title: 'اكتمل التنزيل', status: 'جارٍ تفعيل الإصدار الجديد…', progress: 92, detail: 'تم التحقق من ملفات التحديث' });
            if (swRegistration.waiting) {
              try { swRegistration.waiting.postMessage({ type: 'SKIP_WAITING' }); } catch (_) {}
            }
          } else if (worker.state === 'activating') {
            showUpdateSplash({ version: updateTargetVersion, title: 'جارٍ تفعيل الإصدار', status: 'لحظات وسيُفتح التطبيق من جديد…', progress: 97, detail: 'تطبيق النسخة الجديدة' });
          }
        });
      });

      let canReload = hadController;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        updateProgressEligible = true;
        if (!canReload) {
          canReload = true;
          return;
        }
        if (updateReloading) return;
        updateReloading = true;
        showUpdateSplash({ version: updateTargetVersion || APP_VERSION, title: 'تم التحديث بنجاح', status: 'إعادة فتح التطبيق على الإصدار الجديد…', progress: 100, detail: 'اكتمل تثبيت جميع الملفات' });
        setTimeout(() => location.reload(), 650);
      });

      await checkForAppUpdate();
      setInterval(() => checkForAppUpdate(), 30 * 60 * 1000);
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') checkForAppUpdate();
      });
      window.addEventListener('online', () => checkForAppUpdate());
    } catch (error) {
      console.warn('تعذر تهيئة محدث التطبيق', error);
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
    await initAppUpdater();
  }

  boot().catch(error => {
    console.error(error);
    $('viewRoot').innerHTML = `<div class="empty-state"><h3>تعذر تشغيل التطبيق</h3><p>${escapeHTML(error.message || 'خطأ غير معروف')}</p></div>`;
  });
})();
