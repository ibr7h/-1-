(() => {
  const state = {
    step: 0,
    data: {
      school: { name: '', shortName: '', schoolType: 'complex', educationRegion: '', educationOffice: '' },
      staff: { principal: '', vicePrincipal: '', coordinator: '' },
      plan: { name: 'الخطة التشغيلية', academicYear: '1448 هـ', term: '1', weeksCount: 19, startDate: '' }
    }
  };

  const steps = [
    { key: 'school', title: 'بيانات المدرسة', subtitle: 'أنشئ ملف المدرسة الأساسي' },
    { key: 'staff', title: 'المسؤولون', subtitle: 'أدخل أسماء المسؤولين الذين سيظهرون في الخطة' },
    { key: 'plan', title: 'العام والخطة', subtitle: 'حدد العام والفترة وبداية الأسابيع' },
    { key: 'review', title: 'مراجعة وإنشاء', subtitle: 'راجع البيانات قبل إنشاء مساحة المدرسة' }
  ];

  const typeLabel = { complex: 'مجمع', primary: 'ابتدائي', middle: 'متوسط', secondary: 'ثانوي', other: 'أخرى' };

  const esc = value => String(value ?? '').replace(/[&<>'"]/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;' }[c]));

  function addDays(isoDate, days) {
    if (!isoDate) return null;
    const d = new Date(`${isoDate}T12:00:00`);
    d.setDate(d.getDate() + days);
    return d.toISOString().slice(0, 10);
  }

  function field(label, id, value = '', attrs = '') {
    return `<label class="setup-field"><span>${label}</span><input id="${id}" value="${esc(value)}" ${attrs}></label>`;
  }

  function stepSchool() {
    const s = state.data.school;
    return `
      <div class="setup-grid">
        <label class="setup-field setup-full"><span>اسم المدرسة <b>*</b></span><input id="setupSchoolName" value="${esc(s.name)}" placeholder="مثال: مدرسة النور المتوسطة" autocomplete="organization"></label>
        ${field('الاسم المختصر', 'setupSchoolShort', s.shortName, 'placeholder="مثال: النور المتوسطة"')}
        <label class="setup-field"><span>نوع المدرسة</span><select id="setupSchoolType">
          ${Object.entries(typeLabel).map(([value,label]) => `<option value="${value}" ${s.schoolType === value ? 'selected' : ''}>${label}</option>`).join('')}
        </select></label>
        ${field('المنطقة التعليمية', 'setupSchoolRegion', s.educationRegion, 'placeholder="مثال: جازان"')}
        ${field('الإدارة / مكتب التعليم', 'setupSchoolOffice', s.educationOffice, 'placeholder="اختياري"')}
      </div>`;
  }

  function stepStaff() {
    const s = state.data.staff;
    return `
      <div class="setup-grid">
        ${field('مدير / مديرة المدرسة', 'setupPrincipal', s.principal, 'placeholder="الاسم الكامل"')}
        ${field('وكيل / وكيلة المدرسة', 'setupVicePrincipal', s.vicePrincipal, 'placeholder="اختياري"')}
        ${field('منسق / منسقة الخطة', 'setupCoordinator', s.coordinator, 'placeholder="اختياري"')}
      </div>
      <div class="setup-hint">يمكن تعديل المسؤولين لاحقًا من إعدادات المدرسة دون إعادة إنشاء الخطة.</div>`;
  }

  function stepPlan() {
    const p = state.data.plan;
    return `
      <div class="setup-grid">
        ${field('اسم الخطة', 'setupPlanName', p.name, 'required')}
        ${field('العام الدراسي', 'setupAcademicYear', p.academicYear, 'placeholder="مثال: 1448 هـ"')}
        <label class="setup-field"><span>الفترة / الفصل</span><select id="setupTerm">
          <option value="1" ${p.term === '1' ? 'selected' : ''}>الفترة الأولى</option>
          <option value="2" ${p.term === '2' ? 'selected' : ''}>الفترة الثانية</option>
        </select></label>
        <label class="setup-field"><span>عدد الأسابيع</span><input id="setupWeeks" type="number" min="1" max="30" value="${Number(p.weeksCount || 19)}"></label>
        <label class="setup-field setup-full"><span>تاريخ بداية الدراسة</span><input id="setupStartDate" type="date" value="${esc(p.startDate)}"></label>
      </div>
      <div class="setup-hint">إذا أدخلت تاريخ البداية فسيُنشئ التطبيق الأسابيع تلقائيًا. ويمكن تعديلها لاحقًا.</div>`;
  }

  function reviewRow(label, value) {
    return `<div class="setup-review-row"><span>${label}</span><strong>${esc(value || '—')}</strong></div>`;
  }

  function stepReview() {
    const { school, staff, plan } = state.data;
    return `
      <div class="setup-review">
        <section><h3>المدرسة</h3>
          ${reviewRow('الاسم', school.name)}
          ${reviewRow('النوع', typeLabel[school.schoolType])}
          ${reviewRow('المنطقة', school.educationRegion)}
          ${reviewRow('الإدارة / المكتب', school.educationOffice)}
        </section>
        <section><h3>المسؤولون</h3>
          ${reviewRow('مدير المدرسة', staff.principal)}
          ${reviewRow('وكيل المدرسة', staff.vicePrincipal)}
          ${reviewRow('منسق الخطة', staff.coordinator)}
        </section>
        <section><h3>الخطة الأولى</h3>
          ${reviewRow('الخطة', plan.name)}
          ${reviewRow('العام', plan.academicYear)}
          ${reviewRow('الفترة', plan.term === '2' ? 'الفترة الثانية' : 'الفترة الأولى')}
          ${reviewRow('عدد الأسابيع', `${Number(plan.weeksCount || 19)} أسبوع`)}
          ${reviewRow('البداية', plan.startDate)}
        </section>
      </div>`;
  }

  function readCurrentStep() {
    if (state.step === 0) {
      const name = document.getElementById('setupSchoolName')?.value.trim() || '';
      if (!name) throw new Error('أدخل اسم المدرسة للمتابعة');
      state.data.school = {
        name,
        shortName: document.getElementById('setupSchoolShort')?.value.trim() || name,
        schoolType: document.getElementById('setupSchoolType')?.value || 'complex',
        educationRegion: document.getElementById('setupSchoolRegion')?.value.trim() || '',
        educationOffice: document.getElementById('setupSchoolOffice')?.value.trim() || ''
      };
    } else if (state.step === 1) {
      state.data.staff = {
        principal: document.getElementById('setupPrincipal')?.value.trim() || '',
        vicePrincipal: document.getElementById('setupVicePrincipal')?.value.trim() || '',
        coordinator: document.getElementById('setupCoordinator')?.value.trim() || ''
      };
    } else if (state.step === 2) {
      const weeksCount = Math.min(30, Math.max(1, Number(document.getElementById('setupWeeks')?.value || 19)));
      state.data.plan = {
        name: document.getElementById('setupPlanName')?.value.trim() || 'الخطة التشغيلية',
        academicYear: document.getElementById('setupAcademicYear')?.value.trim() || '',
        term: document.getElementById('setupTerm')?.value || '1',
        weeksCount,
        startDate: document.getElementById('setupStartDate')?.value || ''
      };
    }
  }

  function showError(message) {
    const box = document.getElementById('setupError');
    if (!box) return;
    box.textContent = message;
    box.hidden = !message;
  }

  function render() {
    const step = steps[state.step];
    const overlay = document.getElementById('firstRunSetup');
    if (!overlay) return;

    const body = state.step === 0 ? stepSchool() : state.step === 1 ? stepStaff() : state.step === 2 ? stepPlan() : stepReview();
    overlay.innerHTML = `
      <div class="setup-card" role="dialog" aria-modal="true" aria-labelledby="setupTitle">
        <header class="setup-header">
          <div class="setup-logo">خ</div>
          <div><span>إعداد أول مرة</span><h1 id="setupTitle">${step.title}</h1><p>${step.subtitle}</p></div>
        </header>
        <div class="setup-progress" aria-label="تقدم الإعداد">
          ${steps.map((item, i) => `<div class="setup-progress-item ${i === state.step ? 'is-current' : ''} ${i < state.step ? 'is-done' : ''}"><b>${i < state.step ? '✓' : i + 1}</b><span>${item.title}</span></div>`).join('')}
        </div>
        <main class="setup-body">${body}<div id="setupError" class="setup-error" hidden></div></main>
        <footer class="setup-actions">
          <button id="setupBack" class="secondary-button" type="button" ${state.step === 0 ? 'disabled' : ''}>السابق</button>
          <div class="setup-step-count">${state.step + 1} / ${steps.length}</div>
          <button id="setupNext" class="primary-button" type="button">${state.step === steps.length - 1 ? 'إنشاء وفتح التطبيق' : 'التالي'}</button>
        </footer>
      </div>`;

    document.getElementById('setupBack').addEventListener('click', () => {
      try { if (state.step < 3) readCurrentStep(); } catch (_) {}
      if (state.step > 0) { state.step -= 1; render(); }
    });

    document.getElementById('setupNext').addEventListener('click', async event => {
      showError('');
      try {
        if (state.step < 3) readCurrentStep();
        if (state.step < steps.length - 1) {
          state.step += 1;
          render();
          return;
        }
        event.currentTarget.disabled = true;
        event.currentTarget.textContent = 'جارٍ الإنشاء…';
        await completeSetup();
      } catch (error) {
        showError(error.message || 'تعذر إكمال الإعداد');
        event.currentTarget.disabled = false;
      }
    });
  }

  async function completeSetup() {
    const now = new Date().toISOString();
    const schoolId = PlanDB.id('school');
    const planId = PlanDB.id('plan');
    const { school, staff, plan } = state.data;

    await PlanDB.put('schools', {
      id: schoolId,
      ...school,
      isArchived: false,
      createdAt: now,
      updatedAt: now
    });

    const staffRecords = [
      ['principal', 'مدير المدرسة', staff.principal],
      ['vice_principal', 'وكيل المدرسة', staff.vicePrincipal],
      ['coordinator', 'منسق الخطة', staff.coordinator]
    ].filter(([, , name]) => name);

    for (const [role, roleLabel, name] of staffRecords) {
      await PlanDB.put('staff', {
        id: PlanDB.id('staff'),
        schoolId,
        role,
        roleLabel,
        name,
        isActive: true,
        createdAt: now,
        updatedAt: now
      });
    }

    await PlanDB.put('plans', {
      id: planId,
      schoolId,
      name: plan.name,
      academicYear: plan.academicYear,
      term: plan.term,
      weeksCount: Number(plan.weeksCount),
      startDate: plan.startDate || null,
      status: 'active',
      createdAt: now,
      updatedAt: now
    });

    for (let i = 0; i < Number(plan.weeksCount); i += 1) {
      const startDate = plan.startDate ? addDays(plan.startDate, i * 7) : null;
      await PlanDB.put('weeks', {
        id: PlanDB.id('week'),
        schoolId,
        planId,
        weekNumber: i + 1,
        startDate,
        endDate: startDate ? addDays(startDate, 4) : null,
        title: `الأسبوع ${i + 1}`,
        status: 'planned',
        notes: '',
        createdAt: now,
        updatedAt: now
      });
    }

    const settings = await PlanDB.get('settings', 'app-settings') || { id: 'app-settings', schemaVersion: 2 };
    settings.activeSchoolId = schoolId;
    settings.firstRunCompleted = true;
    settings.updatedAt = now;
    await PlanDB.put('settings', settings);

    location.reload();
  }

  async function init() {
    if (!window.PlanDB) return;
    await PlanDB.ensureSeed();
    const schools = (await PlanDB.getAll('schools')).filter(s => !s.isArchived);
    if (schools.length) return;

    const overlay = document.createElement('div');
    overlay.id = 'firstRunSetup';
    overlay.className = 'setup-overlay';
    document.body.appendChild(overlay);
    document.documentElement.classList.add('setup-active');
    render();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => init().catch(console.error));
  } else {
    init().catch(console.error);
  }
})();
