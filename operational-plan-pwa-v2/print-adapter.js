(() => {
  const KEY_PREFIX = 'operational-plan-print-payload-v2:';

  function makeId() {
    if (globalThis.crypto?.randomUUID) return crypto.randomUUID();
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  }

  function normalizeWeekNumber(week, index) {
    return Number(week?.number ?? week?.weekNumber ?? index + 1);
  }

  async function buildPlanBundle(plan) {
    let weeks = await PlanDB.getByIndex('weeks', 'planId', plan.id);
    const events = await PlanDB.getByIndex('events', 'planId', plan.id);

    if (!weeks.length && window.PlanEditor?.ensureWeeks) {
      weeks = await window.PlanEditor.ensureWeeks(plan);
    }

    weeks = [...weeks]
      .map((week, index) => ({ ...week, number: normalizeWeekNumber(week, index) }))
      .sort((a, b) => a.number - b.number);

    events.sort((a, b) => String(a.startDate || '').localeCompare(String(b.startDate || '')));
    return { ...plan, weeks, events };
  }

  async function buildPayload(school, plans = []) {
    if (!school?.id) throw new Error('اختر مدرسة قبل فتح الطباعة');

    const printablePlans = plans
      .filter(plan => plan && plan.status !== 'archived')
      .sort((a, b) => Number(a.term || 0) - Number(b.term || 0));

    if (!printablePlans.length) throw new Error('أنشئ خطة واحدة على الأقل قبل الطباعة');

    const [staff, planBundles] = await Promise.all([
      PlanDB.getByIndex('staff', 'schoolId', school.id),
      Promise.all(printablePlans.map(buildPlanBundle))
    ]);

    return {
      schemaVersion: 1,
      source: 'operational-plan-pwa-v2',
      createdAt: new Date().toISOString(),
      school,
      staff: staff.filter(item => item.isActive !== false),
      plans: planBundles
    };
  }

  async function openSchoolPrint(school, plans = []) {
    // Open synchronously from the user's click so iOS/Safari does not block the new tab.
    const target = window.open('about:blank', '_blank');
    if (!target) throw new Error('تعذر فتح نافذة الطباعة. اسمح بالنوافذ المنبثقة لهذا الموقع.');

    try {
      const payload = await buildPayload(school, plans);
      const payloadId = makeId();
      const key = `${KEY_PREFIX}${payloadId}`;
      localStorage.setItem(key, JSON.stringify(payload));

      // Remove stale print payloads while keeping the new one.
      for (let i = localStorage.length - 1; i >= 0; i -= 1) {
        const storageKey = localStorage.key(i);
        if (storageKey?.startsWith(KEY_PREFIX) && storageKey !== key) {
          localStorage.removeItem(storageKey);
        }
      }

      const url = `../operational-plan-pwa/index.html?printSource=pwa-v2&payload=${encodeURIComponent(payloadId)}`;
      target.location.replace(url);
      return payload;
    } catch (error) {
      try { target.close(); } catch (_) {}
      throw error;
    }
  }

  window.PrintAdapter = {
    KEY_PREFIX,
    buildPayload,
    openSchoolPrint
  };
})();
