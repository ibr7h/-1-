(() => {
  const YEAR_LABEL = '1448–1449 هـ';
  const CALENDAR_KEY = 'sa-general-1448-1449';

  const periods = {
    '1': { term: '1', name: 'الخطة التشغيلية - الفترة الأولى', startDate: '2026-08-23', endDate: '2027-01-07', weeksCount: 19 },
    '2': { term: '2', name: 'الخطة التشغيلية - الفترة الثانية', startDate: '2027-01-17', endDate: '2027-06-24', weeksCount: 19 }
  };

  const fixedEvents = [
    { key: 'admin-return', title: 'عودة الهيئة الإدارية والمشرفين التربويين', type: 'occasion', startDate: '2026-08-11', endDate: '2026-08-11', term: '1' },
    { key: 'teachers-return', title: 'عودة المعلمين الممارسين للتدريس', type: 'occasion', startDate: '2026-08-16', endDate: '2026-08-16', term: '1' },
    { key: 'year-start', title: 'بداية العام الدراسي', type: 'occasion', startDate: '2026-08-23', endDate: '2026-08-23', term: '1' },
    { key: 'national-day', title: 'إجازة اليوم الوطني', type: 'holiday', startDate: '2026-09-23', endDate: '2026-09-26', term: '1' },
    { key: 'fall-break', title: 'إجازة الخريف', type: 'holiday', startDate: '2026-11-20', endDate: '2026-11-28', term: '1', fullWeekBreak: true },
    { key: 'midyear-break', title: 'إجازة منتصف العام الدراسي', type: 'holiday', startDate: '2027-01-08', endDate: '2027-01-16', term: '1' },
    { key: 'term2-start', title: 'بداية الفترة الثانية', type: 'occasion', startDate: '2027-01-17', endDate: '2027-01-17', term: '2' },
    { key: 'founding-day', title: 'إجازة يوم التأسيس', type: 'holiday', startDate: '2027-02-19', endDate: '2027-02-22', term: '2' },
    { key: 'eid-fitr', title: 'إجازة عيد الفطر', type: 'holiday', startDate: '2027-02-26', endDate: '2027-03-13', term: '2', fullWeekBreak: true },
    { key: 'eid-adha', title: 'إجازة عيد الأضحى', type: 'holiday', startDate: '2027-05-07', endDate: '2027-05-22', term: '2', fullWeekBreak: true },
    { key: 'year-end', title: 'إجازة نهاية العام الدراسي', type: 'holiday', startDate: '2027-06-24', endDate: '2027-06-24', term: '2' }
  ];

  function addDays(isoDate, days) {
    if (!isoDate) return null;
    const d = new Date(`${isoDate}T12:00:00`);
    if (Number.isNaN(d.getTime())) return null;
    d.setDate(d.getDate() + days);
    return d.toISOString().slice(0, 10);
  }

  function fullyCoveredByBreak(startDate, endDate) {
    return fixedEvents.some(event => event.fullWeekBreak && event.startDate <= startDate && event.endDate >= endDate);
  }

  function instructionalWeeks(term) {
    const period = periods[String(term)];
    if (!period) return [];
    const result = [];
    let cursor = period.startDate;
    while (cursor && cursor <= period.endDate) {
      const schoolWeekEnd = addDays(cursor, 4);
      if (!fullyCoveredByBreak(cursor, schoolWeekEnd)) {
        result.push({
          number: result.length + 1,
          weekNumber: result.length + 1,
          title: `الأسبوع ${result.length + 1}`,
          startDate: cursor,
          endDate: schoolWeekEnd
        });
      }
      cursor = addDays(cursor, 7);
    }
    return result.slice(0, period.weeksCount);
  }

  async function removeExtraWeeks(planId, keepIds) {
    const rows = await PlanDB.getByIndex('weeks', 'planId', planId);
    for (const row of rows) {
      if (!keepIds.has(row.id)) await PlanDB.remove('weeks', row.id);
    }
  }

  async function applyWeeks(plan, term) {
    const now = new Date().toISOString();
    const ranges = instructionalWeeks(term);
    const existing = await PlanDB.getByIndex('weeks', 'planId', plan.id);
    existing.sort((a, b) => Number(a.number ?? a.weekNumber ?? 0) - Number(b.number ?? b.weekNumber ?? 0));
    const keepIds = new Set();

    for (let index = 0; index < ranges.length; index += 1) {
      const range = ranges[index];
      const old = existing[index] || null;
      const row = {
        ...(old || {}),
        id: old?.id || PlanDB.id('week'),
        schoolId: plan.schoolId,
        planId: plan.id,
        number: range.number,
        weekNumber: range.weekNumber,
        title: old?.title && !/^الأسبوع\s+\d+$/.test(old.title) ? old.title : range.title,
        startDate: range.startDate,
        endDate: range.endDate,
        content: old?.content || '',
        notes: old?.notes || '',
        status: old?.status || 'planned',
        createdAt: old?.createdAt || now,
        updatedAt: now
      };
      await PlanDB.put('weeks', row);
      keepIds.add(row.id);
    }

    await removeExtraWeeks(plan.id, keepIds);
  }

  async function findOrCreatePlan(school, existingPlans, term) {
    const period = periods[String(term)];
    const now = new Date().toISOString();
    let plan = existingPlans.find(item => item.officialCalendarKey === CALENDAR_KEY && String(item.term) === String(term));
    if (!plan) {
      plan = existingPlans.find(item => String(item.term) === String(term) && String(item.academicYear || '').includes('1448'));
    }
    if (!plan) {
      plan = {
        id: PlanDB.id('plan'),
        schoolId: school.id,
        name: period.name,
        academicYear: YEAR_LABEL,
        term: String(term),
        status: 'active',
        createdAt: now
      };
    }
    plan.schoolId = school.id;
    plan.name = plan.name || period.name;
    plan.academicYear = YEAR_LABEL;
    plan.term = String(term);
    plan.weeksCount = period.weeksCount;
    plan.startDate = period.startDate;
    plan.endDate = period.endDate;
    plan.status = plan.status === 'archived' ? 'active' : (plan.status || 'active');
    plan.officialCalendarKey = CALENDAR_KEY;
    plan.updatedAt = now;
    await PlanDB.put('plans', plan);
    await applyWeeks(plan, term);
    return plan;
  }

  async function applyEvents(school, plans) {
    const now = new Date().toISOString();
    for (const event of fixedEvents) {
      const plan = plans.find(item => String(item.term) === String(event.term));
      if (!plan) continue;
      const id = `official-${CALENDAR_KEY}-${school.id}-${event.key}`;
      const existing = await PlanDB.get('events', id);
      await PlanDB.put('events', {
        ...(existing || {}),
        id,
        schoolId: school.id,
        planId: plan.id,
        title: event.title,
        type: event.type,
        startDate: event.startDate,
        endDate: event.endDate,
        notes: 'موعد رسمي ثابت للعام الدراسي 1448–1449هـ',
        official: true,
        officialKey: event.key,
        calendarKey: CALENDAR_KEY,
        createdAt: existing?.createdAt || now,
        updatedAt: now
      });
    }
  }

  async function installForSchool(school, existingPlans = []) {
    if (!school?.id) throw new Error('اختر مدرسة أولًا');
    const period1 = await findOrCreatePlan(school, existingPlans, '1');
    const refreshedPlans = await PlanDB.getByIndex('plans', 'schoolId', school.id);
    const period2 = await findOrCreatePlan(school, refreshedPlans, '2');
    const finalPlans = [period1, period2];
    await applyEvents(school, finalPlans);
    return finalPlans;
  }

  window.OperationalAcademicCalendar = {
    key: CALENDAR_KEY,
    yearLabel: YEAR_LABEL,
    totalInstructionalWeeks: 38,
    periods,
    fixedEvents: fixedEvents.map(item => ({ ...item })),
    instructionalWeeks,
    installForSchool
  };
})();