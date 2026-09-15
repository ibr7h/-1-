(() => {
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

  const eventTypeLabel = {
    holiday: 'إجازة',
    occasion: 'مناسبة',
    exam: 'اختبارات',
    note: 'ملاحظة',
    suspension: 'تعليق دراسة'
  };

  function esc(value = '') {
    return String(value).replace(/[&<>'"]/g, c => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
    }[c]));
  }

  function toast(message) {
    const node = document.createElement('div');
    node.className = 'toast';
    node.textContent = message;
    document.body.appendChild(node);
    setTimeout(() => node.remove(), 2600);
  }

  function addDays(isoDate, days) {
    if (!isoDate) return null;
    const d = new Date(`${isoDate}T12:00:00`);
    if (Number.isNaN(d.getTime())) return null;
    d.setDate(d.getDate() + days);
    return d.toISOString().slice(0, 10);
  }

  function formatDate(iso) {
    if (!iso) return 'غير محدد';
    const d = new Date(`${iso}T12:00:00`);
    if (Number.isNaN(d.getTime())) return iso;
    return new Intl.DateTimeFormat('ar-SA-u-ca-gregory', {
      year: 'numeric', month: 'short', day: 'numeric'
    }).format(d);
  }

  function overlaps(event, week) {
    if (!event.startDate || !week.startDate) return false;
    const eventStart = event.startDate;
    const eventEnd = event.endDate || event.startDate;
    const weekStart = week.startDate;
    const weekEnd = week.endDate || week.startDate;
    return eventStart <= weekEnd && eventEnd >= weekStart;
  }

  async function ensureWeeks(plan) {
    if (!plan?.id || !plan.schoolId) return [];
    let weeks = await PlanDB.getByIndex('weeks', 'planId', plan.id);
    const targetCount = Math.max(1, Number(plan.weeksCount || 1));

    if (!weeks.length) {
      for (let i = 0; i < targetCount; i += 1) {
        const startDate = plan.startDate ? addDays(plan.startDate, i * 7) : null;
        const endDate = startDate ? addDays(startDate, 4) : null;
        await PlanDB.put('weeks', {
          id: PlanDB.id('week'),
          schoolId: plan.schoolId,
          planId: plan.id,
          number: i + 1,
          weekNumber: i + 1,
          title: `الأسبوع ${i + 1}`,
          startDate,
          endDate,
          content: '',
          notes: '',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
      }
      weeks = await PlanDB.getByIndex('weeks', 'planId', plan.id);
    }

    for (let index = 0; index < weeks.length; index += 1) {
      const week = weeks[index];
      const normalizedNumber = Number(week.number ?? week.weekNumber ?? index + 1);
      let changed = false;
      if (Number(week.number || 0) !== normalizedNumber) { week.number = normalizedNumber; changed = true; }
      if (Number(week.weekNumber || 0) !== normalizedNumber) { week.weekNumber = normalizedNumber; changed = true; }
      if (changed) await PlanDB.put('weeks', week);
    }
    weeks.sort((a, b) => Number(a.number ?? a.weekNumber ?? 0) - Number(b.number ?? b.weekNumber ?? 0));
    return weeks;
  }

  async function loadPlanData(planId) {
    const plan = await PlanDB.get('plans', planId);
    if (!plan) throw new Error('الخطة غير موجودة');
    const [weeks, allEvents] = await Promise.all([
      ensureWeeks(plan),
      PlanDB.getByIndex('events', 'planId', planId)
    ]);
    allEvents.sort((a, b) => String(a.startDate || '').localeCompare(String(b.startDate || '')));
    return { plan, weeks, events: allEvents };
  }

  function eventChip(event) {
    return `<span class="event-chip event-${esc(event.type || 'note')}">
      <b>${esc(eventTypeLabel[event.type] || 'حدث')}</b>
      <span>${esc(event.title || '')}</span>
    </span>`;
  }

  function planEditorMarkup(data) {
    const { plan, weeks, events } = data;
    return `
      <div class="editor-toolbar">
        <div>
          <button class="text-button editor-back" type="button">← العودة إلى الخطط</button>
          <h1>${esc(plan.name)}</h1>
          <p>${esc(plan.academicYear || '')} · ${plan.term === '2' ? 'الفترة الثانية' : 'الفترة الأولى'} · ${weeks.length} أسبوع</p>
        </div>
        <div class="editor-toolbar-actions">
          <button class="secondary-button" type="button" data-editor-calendar>التقويم</button>
          <button class="primary-button" type="button" data-add-event>＋ إجازة / مناسبة</button>
        </div>
      </div>

      <div class="editor-summary">
        <div><span>بداية الخطة</span><strong>${formatDate(plan.startDate)}</strong></div>
        <div><span>الأحداث</span><strong>${events.length}</strong></div>
        <div><span>الأسابيع</span><strong>${weeks.length}</strong></div>
        <div><span>الحفظ</span><strong>تلقائي محليًا</strong></div>
      </div>

      <div class="weeks-editor">
        ${weeks.map(week => {
          const weekEvents = events.filter(event => overlaps(event, week));
          return `
            <article class="week-editor-card" data-week-card="${esc(week.id)}">
              <div class="week-editor-head">
                <div class="week-number">${Number(week.number || 0)}</div>
                <div>
                  <h3>${esc(week.title || `الأسبوع ${week.number}`)}</h3>
                  <p>${week.startDate ? `${formatDate(week.startDate)} — ${formatDate(week.endDate)}` : 'لم يحدد تاريخ هذا الأسبوع'}</p>
                </div>
                <span class="save-state" data-save-state>محفوظ</span>
              </div>

              <div class="week-fields">
                <label><span>من</span><input type="date" data-week-start value="${esc(week.startDate || '')}"></label>
                <label><span>إلى</span><input type="date" data-week-end value="${esc(week.endDate || '')}"></label>
              </div>

              <label class="week-content-field">
                <span>أعمال / محتوى الأسبوع</span>
                <textarea data-week-content rows="3" placeholder="اكتب الأعمال أو الموضوعات المخطط لها في هذا الأسبوع…">${esc(week.content || '')}</textarea>
              </label>

              <label class="week-content-field">
                <span>ملاحظات</span>
                <textarea data-week-notes rows="2" placeholder="ملاحظات إضافية…">${esc(week.notes || '')}</textarea>
              </label>

              <div class="week-events">
                <div class="week-events-title"><span>الأحداث المرتبطة تلقائيًا</span><button type="button" class="text-button" data-add-event data-week-number="${Number(week.number || 0)}">＋ إضافة</button></div>
                <div class="week-event-list">${weekEvents.length ? weekEvents.map(eventChip).join('') : '<span class="muted-empty">لا توجد إجازات أو مناسبات في هذا الأسبوع</span>'}</div>
              </div>

              <div class="week-actions">
                <button type="button" class="secondary-button" data-save-week="${esc(week.id)}">حفظ الأسبوع</button>
              </div>
            </article>`;
        }).join('')}
      </div>`;
  }

  async function saveWeek(card, weekId) {
    const week = await PlanDB.get('weeks', weekId);
    if (!week) return;
    week.startDate = $('[data-week-start]', card)?.value || null;
    week.endDate = $('[data-week-end]', card)?.value || null;
    week.content = $('[data-week-content]', card)?.value.trim() || '';
    week.notes = $('[data-week-notes]', card)?.value.trim() || '';
    week.updatedAt = new Date().toISOString();
    await PlanDB.put('weeks', week);
    const state = $('[data-save-state]', card);
    if (state) {
      state.textContent = 'تم الحفظ';
      state.classList.add('is-saved');
      setTimeout(() => state.classList.remove('is-saved'), 1200);
    }
    toast('تم حفظ الأسبوع');
  }

  function markDirty(card) {
    const state = $('[data-save-state]', card);
    if (!state) return;
    state.textContent = 'تغييرات غير محفوظة';
    state.classList.remove('is-saved');
    state.classList.add('is-dirty');
  }

  function eventDialogMarkup({ event = null, plans = [], defaultPlanId = '', suggestedStart = '' } = {}) {
    const currentPlanId = event?.planId || defaultPlanId || plans[0]?.id || '';
    return `
      <dialog class="modal editor-event-dialog" id="editorEventDialog">
        <form method="dialog" class="modal-card">
          <div class="modal-head">
            <div><span class="eyebrow">التقويم المدرسي</span><h2>${event ? 'تعديل حدث' : 'إضافة إجازة أو مناسبة'}</h2></div>
            <button class="icon-button" type="button" data-cancel-event aria-label="إلغاء">×</button>
          </div>
          <input type="hidden" id="editorEventId" value="${esc(event?.id || '')}">
          <div class="form-grid">
            <label class="field full"><span>اسم الحدث</span><input id="editorEventTitle" value="${esc(event?.title || '')}" placeholder="مثال: اليوم الوطني" required></label>
            <label class="field"><span>النوع</span><select id="editorEventType">
              ${Object.entries(eventTypeLabel).map(([value, label]) => `<option value="${value}" ${(event?.type || 'holiday') === value ? 'selected' : ''}>${label}</option>`).join('')}
            </select></label>
            <label class="field"><span>الخطة</span><select id="editorEventPlan">
              ${plans.map(plan => `<option value="${esc(plan.id)}" ${plan.id === currentPlanId ? 'selected' : ''}>${esc(plan.name)} — ${esc(plan.academicYear || '')}</option>`).join('')}
            </select></label>
            <label class="field"><span>تاريخ البداية</span><input type="date" id="editorEventStart" value="${esc(event?.startDate || suggestedStart || '')}" required></label>
            <label class="field"><span>تاريخ النهاية</span><input type="date" id="editorEventEnd" value="${esc(event?.endDate || event?.startDate || suggestedStart || '')}"></label>
            <label class="field full"><span>ملاحظات</span><input id="editorEventNotes" value="${esc(event?.notes || '')}" placeholder="اختياري"></label>
          </div>
          <div class="modal-actions">
            ${event ? '<button type="button" class="danger-button" data-delete-event>حذف</button>' : ''}
            <button class="secondary-button" type="button" data-cancel-event>إلغاء</button>
            <button class="primary-button" type="button" data-save-event>حفظ</button>
          </div>
        </form>
      </dialog>`;
  }

  async function openEventDialog({ school, plans, defaultPlanId, eventId = null, suggestedStart = '' }) {
    const old = $('#editorEventDialog');
    if (old) old.remove();
    const event = eventId ? await PlanDB.get('events', eventId) : null;
    document.body.insertAdjacentHTML('beforeend', eventDialogMarkup({ event, plans, defaultPlanId, suggestedStart }));
    const dialog = $('#editorEventDialog');
    dialog.showModal();

    $$('[data-cancel-event]', dialog).forEach(button => button.addEventListener('click', () => {
      dialog.close('cancel');
    }));

    $('[data-save-event]', dialog).addEventListener('click', async () => {
      const title = $('#editorEventTitle', dialog).value.trim();
      const planId = $('#editorEventPlan', dialog).value;
      const startDate = $('#editorEventStart', dialog).value;
      const endDate = $('#editorEventEnd', dialog).value || startDate;
      if (!title || !planId || !startDate) {
        toast('أدخل اسم الحدث والخطة وتاريخ البداية');
        return;
      }
      if (endDate < startDate) {
        toast('تاريخ النهاية يجب أن يكون بعد تاريخ البداية');
        return;
      }
      const existingId = $('#editorEventId', dialog).value;
      const existing = existingId ? await PlanDB.get('events', existingId) : null;
      await PlanDB.put('events', {
        id: existingId || PlanDB.id('event'),
        schoolId: school.id,
        planId,
        title,
        type: $('#editorEventType', dialog).value,
        startDate,
        endDate,
        notes: $('#editorEventNotes', dialog).value.trim(),
        createdAt: existing?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      dialog.close();
      dialog.remove();
      toast('تم حفظ الحدث وربطه بالأسابيع المناسبة');
      const root = $('#viewRoot');
      if (root?.dataset.editorPlanId) await openPlan(root.dataset.editorPlanId, school, plans);
      else await openCalendar(school, plans);
    });

    $('[data-delete-event]', dialog)?.addEventListener('click', async () => {
      if (!event?.id) return;
      if (!confirm(`حذف «${event.title}»؟`)) return;
      await PlanDB.remove('events', event.id);
      dialog.close();
      dialog.remove();
      toast('تم حذف الحدث');
      const root = $('#viewRoot');
      if (root?.dataset.editorPlanId) await openPlan(root.dataset.editorPlanId, school, plans);
      else await openCalendar(school, plans);
    });

    dialog.addEventListener('close', () => dialog.remove(), { once: true });
  }

  async function openPlan(planId, school, plans) {
    const root = $('#viewRoot');
    if (!root) return;
    root.dataset.editorPlanId = planId;
    root.innerHTML = '<div class="editor-loading">جاري تحميل الأسابيع…</div>';
    try {
      const data = await loadPlanData(planId);
      root.innerHTML = planEditorMarkup(data);
      root.dataset.editorPlanId = planId;

      $('.editor-back', root)?.addEventListener('click', () => {
        delete root.dataset.editorPlanId;
        document.querySelector('[data-view="plans"]')?.click();
      });

      $('[data-editor-calendar]', root)?.addEventListener('click', () => openCalendar(school, plans));

      $$('[data-add-event]', root).forEach(button => button.addEventListener('click', async () => {
        let suggestedStart = '';
        if (button.dataset.weekNumber) {
          const week = data.weeks.find(item => String(item.number) === String(button.dataset.weekNumber));
          suggestedStart = week?.startDate || '';
        }
        await openEventDialog({ school, plans, defaultPlanId: planId, suggestedStart });
      }));

      $$('[data-week-card]', root).forEach(card => {
        $$('input,textarea', card).forEach(input => input.addEventListener('input', () => markDirty(card)));
      });

      $$('[data-save-week]', root).forEach(button => button.addEventListener('click', () => {
        const card = button.closest('[data-week-card]');
        saveWeek(card, button.dataset.saveWeek);
      }));
    } catch (error) {
      root.innerHTML = `<div class="empty-state"><h3>تعذر فتح محرر الخطة</h3><p>${esc(error.message)}</p></div>`;
    }
  }

  function calendarMarkup(events, plans) {
    return `
      <div class="editor-toolbar">
        <div><h1>التقويم</h1><p>الإجازات والمناسبات والاختبارات لجميع خطط المدرسة النشطة</p></div>
        <button class="primary-button" type="button" data-calendar-add>＋ إضافة حدث</button>
      </div>
      <div class="calendar-manager">
        ${events.length ? events.map(event => {
          const plan = plans.find(item => item.id === event.planId);
          return `<article class="calendar-event-card event-border-${esc(event.type || 'note')}">
            <div class="calendar-event-type">${esc(eventTypeLabel[event.type] || 'حدث')}</div>
            <div class="calendar-event-main"><h3>${esc(event.title)}</h3><p>${formatDate(event.startDate)}${event.endDate && event.endDate !== event.startDate ? ` — ${formatDate(event.endDate)}` : ''}</p><span>${esc(plan?.name || 'خطة غير محددة')} ${plan?.academicYear ? `· ${esc(plan.academicYear)}` : ''}</span></div>
            <button type="button" class="secondary-button" data-edit-event="${esc(event.id)}">تعديل</button>
          </article>`;
        }).join('') : '<div class="empty-state"><div class="big-icon">◫</div><h3>لا توجد إجازات أو مناسبات بعد</h3><p>أضف أول حدث وسيظهر تلقائيًا داخل الأسبوع الموافق.</p><button class="primary-button" type="button" data-calendar-add>إضافة حدث</button></div>'}
      </div>`;
  }

  async function openCalendar(school, plans) {
    const root = $('#viewRoot');
    if (!root || !school) return;
    delete root.dataset.editorPlanId;
    root.innerHTML = '<div class="editor-loading">جاري تحميل التقويم…</div>';
    const events = await PlanDB.getByIndex('events', 'schoolId', school.id);
    events.sort((a, b) => String(a.startDate || '').localeCompare(String(b.startDate || '')));
    root.innerHTML = calendarMarkup(events, plans);
    $$('[data-calendar-add]', root).forEach(button => button.addEventListener('click', () => openEventDialog({
      school,
      plans,
      defaultPlanId: plans[0]?.id || ''
    })));
    $$('[data-edit-event]', root).forEach(button => button.addEventListener('click', () => openEventDialog({
      school,
      plans,
      defaultPlanId: plans[0]?.id || '',
      eventId: button.dataset.editEvent
    })));
  }

  function bindPlanButtons(root, school, plans) {
    $$('[data-editor-plan]', root).forEach(button => button.addEventListener('click', () => openPlan(button.dataset.editorPlan, school, plans)));
  }

  window.PlanEditor = {
    ensureWeeks,
    openPlan,
    openCalendar,
    bindPlanButtons,
    eventTypeLabel
  };
})();