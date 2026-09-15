(() => {
  const params = new URLSearchParams(location.search);
  if (params.get('printSource') !== 'pwa-v2') return;

  const payloadId = params.get('payload');
  const key = payloadId ? `operational-plan-print-payload-v2:${payloadId}` : '';
  const DAY_NAMES = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس'];
  const WEEK_ORDINALS = [
    'الأول', 'الثاني', 'الثالث', 'الرابع', 'الخامس', 'السادس', 'السابع', 'الثامن', 'التاسع', 'العاشر',
    'الحادي عشر', 'الثاني عشر', 'الثالث عشر', 'الرابع عشر', 'الخامس عشر', 'السادس عشر', 'السابع عشر', 'الثامن عشر', 'التاسع عشر', 'العشرون',
    'الحادي والعشرون', 'الثاني والعشرون', 'الثالث والعشرون', 'الرابع والعشرون', 'الخامس والعشرون', 'السادس والعشرون', 'السابع والعشرون', 'الثامن والعشرون', 'التاسع والعشرون', 'الثلاثون'
  ];

  function readPayload() {
    if (!key) return null;
    try {
      const payload = JSON.parse(localStorage.getItem(key) || 'null');
      return payload?.schemaVersion === 1 ? payload : null;
    } catch (_) {
      return null;
    }
  }

  function parseISO(iso) {
    if (!iso) return null;
    const d = new Date(`${iso}T12:00:00`);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  function addDays(iso, days) {
    const d = parseISO(iso);
    if (!d) return null;
    d.setDate(d.getDate() + days);
    return d.toISOString().slice(0, 10);
  }

  function nextSunday(iso) {
    const d = parseISO(iso);
    if (!d) return null;
    do { d.setDate(d.getDate() + 1); } while (d.getDay() !== 0);
    return d.toISOString().slice(0, 10);
  }

  function hijriParts(iso) {
    const d = parseISO(iso);
    if (!d) return null;
    try {
      const parts = new Intl.DateTimeFormat('en-US-u-ca-islamic-umalqura', {
        year: 'numeric', month: '2-digit', day: '2-digit'
      }).formatToParts(d);
      const get = type => parts.find(part => part.type === type)?.value;
      const year = get('year');
      const month = get('month');
      const day = get('day');
      if (!year || !month || !day) return null;
      return `${year}/${month.padStart(2, '0')}/${day.padStart(2, '0')}`;
    } catch (_) {
      return null;
    }
  }

  function weekdayName(iso) {
    const d = parseISO(iso);
    if (!d) return '';
    try { return new Intl.DateTimeFormat('ar-SA', { weekday: 'long' }).format(d); }
    catch (_) { return '' ; }
  }

  function hijriWithWeekday(iso) {
    const h = hijriParts(iso);
    if (!h) return iso || '—';
    const day = weekdayName(iso);
    return `${day ? `${day} ` : ''}${h}`;
  }

  function weekTitle(week, index) {
    const stored = String(week?.title || '').trim();
    if (stored && !/^الأسبوع\s+\d+$/.test(stored)) return stored;
    const n = Number(week?.number ?? week?.weekNumber ?? index + 1);
    return `الأسبوع ${WEEK_ORDINALS[n - 1] || n}`;
  }

  function replaceTextNodes(root, from, to) {
    if (!root || !from || !to) return;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let node;
    while ((node = walker.nextNode())) {
      if (node.nodeValue?.includes(from)) node.nodeValue = node.nodeValue.split(from).join(to);
    }
  }

  function setPlanTitle(page, school, plan, period) {
    if (!page) return;
    const target = [...page.querySelectorAll('.editable-zone')]
      .find(el => el.textContent.includes('النظام التشغيلي'));
    if (!target) return;
    if (!plan) {
      target.textContent = `النظام التشغيلي لـ${school.name} - الفترة ${period === '1' ? 'الأولى' : 'الثانية'} — لم تُنشأ خطة`;
      return;
    }
    const termLabel = period === '1' ? 'الفترة الأولى' : 'الفترة الثانية';
    target.textContent = `${plan.name || 'الخطة التشغيلية'} لـ${school.name} - ${termLabel} ${plan.academicYear || ''}`.trim();
  }

  function staffFor(payload, role) {
    return (payload.staff || []).find(item => item.role === role && item.isActive !== false) || null;
  }

  function applySignatures(payload) {
    const ordered = [
      staffFor(payload, 'principal'),
      staffFor(payload, 'vice_principal'),
      staffFor(payload, 'coordinator')
    ];

    ['page-1-signatures', 'page-2-signatures'].forEach(id => {
      const container = document.getElementById(id);
      if (!container) return;
      const columns = [...container.children];
      ordered.forEach((person, index) => {
        if (!person || !columns[index]) return;
        const paragraphs = columns[index].querySelectorAll('p');
        if (paragraphs[0]) paragraphs[0].textContent = person.roleLabel || person.role || '';
        if (paragraphs[1]) paragraphs[1].textContent = person.name || '';
      });
    });
  }

  function overlaps(event, startDate, endDate) {
    if (!event?.startDate || !startDate) return false;
    const eStart = event.startDate;
    const eEnd = event.endDate || event.startDate;
    return eStart <= endDate && eEnd >= startDate;
  }

  function eventsOnDate(events, iso) {
    return (events || []).filter(event => {
      if (!event.startDate || !iso) return false;
      return event.startDate <= iso && (event.endDate || event.startDate) >= iso;
    });
  }

  function printWeekEnd(week) {
    if (!week?.startDate) return week?.endDate || null;
    return addDays(week.startDate, 4);
  }

  function applyDayRows(card, week, events) {
    const start = week?.startDate;
    const rows = [...card.querySelectorAll('tr[data-day]')];
    rows.forEach((row, index) => {
      const dayIndex = Number(row.dataset.day ?? index);
      const date = start ? addDays(start, dayIndex) : null;
      const dayEvents = eventsOnDate(events, date);
      if (dayEvents.length) {
        row.innerHTML = `<td colspan="2" class="text-[9.5px] font-black text-amber-900 py-0.5">${dayEvents.map(e => e.title).filter(Boolean).join(' • ')}</td>`;
      } else {
        // Preserve the approved operational-plan status already present in
        // the frozen template (✓ / X). Do not replace all days with ✓.
      }
    });
  }

  function applyStandardCard(card, week, events, index) {
    const title = card.querySelector('.week-header .editable-zone') || card.querySelector('.week-header span:first-child');
    const date = card.querySelector('.week-date');
    if (title) title.textContent = weekTitle(week, index);
    if (date) {
      const from = hijriParts(week.startDate) || week.startDate || '—';
      const endISO = printWeekEnd(week);
      const to = hijriParts(endISO) || endISO || '—';
      date.textContent = `${from} - ${to}`;
    }
    if (week.startDate) card.dataset.start = hijriParts(week.startDate) || week.startDate;
    applyDayRows(card, week, events);
  }

  function applySpecialCard(card, week, events, index) {
    const weekEnd = printWeekEnd(week) || week?.endDate || week?.startDate;
    const holiday = (events || []).find(event => event.type === 'holiday' && overlaps(event, week?.startDate, weekEnd));
    const header = card.querySelector('.week-header span:first-child');
    const badge = card.querySelector('.status-badge');
    const body = card.querySelector('.editable-zone');

    if (holiday) {
      if (header) header.textContent = holiday.title || 'إجازة';
      if (badge) badge.textContent = 'إجازة رسمية';
      if (body) {
        const end = holiday.endDate || holiday.startDate;
        const back = nextSunday(end);
        body.innerHTML = `
          <p class="font-extrabold text-amber-900">تبدأ: <span class="font-bold text-slate-900">${hijriWithWeekday(holiday.startDate)}</span></p>
          <p class="font-extrabold text-amber-900">تنتهي: <span class="font-bold text-slate-900">${hijriWithWeekday(end)}</span></p>
          <p class="font-black text-emerald-800 border-t border-amber-300 pt-0.5 mt-0.5">العودة: <span>${hijriWithWeekday(back)}</span></p>`;
      }
      return;
    }

    // Preserve the physical slot but remove stale school-specific vacation text.
    if (header) header.textContent = weekTitle(week, index);
    if (badge) badge.textContent = 'أسبوع دراسي';
    if (body) {
      const from = hijriParts(week?.startDate) || week?.startDate || '—';
      const toISO = printWeekEnd(week);
      const to = hijriParts(toISO) || toISO || '—';
      body.innerHTML = `<p class="font-black text-slate-900">${from} - ${to}</p>`;
    }
  }

  function clearCard(card) {
    const header = card.querySelector('.week-header span:first-child');
    const date = card.querySelector('.week-date');
    const badge = card.querySelector('.status-badge');
    const body = card.querySelector('.editable-zone');
    if (header) header.textContent = '—';
    if (date) date.textContent = '—';
    if (badge) badge.textContent = '';
    if (!card.classList.contains('week-card-standard') && body) body.textContent = '—';
    card.querySelectorAll('tr[data-day]').forEach((row, index) => {
      row.innerHTML = `<td>${DAY_NAMES[index] || ''}</td><td></td>`;
    });
  }

  function specialHolidayForCard(card, events) {
    const id = card.id || '';
    const hint = id === 'vacation-card-p1' ? 'الخريف'
      : id === 'vacation-card-eid1' ? 'الفطر'
      : id === 'vacation-card-eid2' ? 'الأضحى'
      : '';
    if (!hint) return null;
    return (events || []).find(event => event.type === 'holiday' && String(event.title || '').includes(hint)) || null;
  }

  function applyPeriod(plan, period) {
    const cards = [...document.querySelectorAll(`.week-card[data-period="${period}"]`)]
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
  }

  function applyInputDates(plan1) {
    if (!plan1?.startDate) return;
    const greg = document.getElementById('start-greg-input');
    const hijri = document.getElementById('start-hijri-input');
    if (greg) greg.value = plan1.startDate;
    if (hijri) hijri.value = hijriParts(plan1.startDate) || '';
  }

  function applyPayload() {
    const payload = readPayload();
    if (!payload?.school) {
      console.warn('PWA v2 print payload is missing or invalid.');
      return;
    }

    document.body.dataset.printSource = 'pwa-v2';
    const school = payload.school;
    const plans = payload.plans || [];
    const plan1 = plans.find(plan => String(plan.term) === '1') || null;
    const plan2 = plans.find(plan => String(plan.term) === '2') || null;

    replaceTextNodes(document.documentElement, 'مجمع أبو السلع الابتدائي والمتوسط', school.name);
    document.title = `النظام التشغيلي - ${school.name}`;

    setPlanTitle(document.getElementById('page-1'), school, plan1, '1');
    setPlanTitle(document.getElementById('page-2'), school, plan2, '2');
    applySignatures(payload);
    applyPeriod(plan1, '1');
    applyPeriod(plan2, '2');
    applyInputDates(plan1);

    window.dispatchEvent(new CustomEvent('pwa-v2-print-data-applied', { detail: { payloadId } }));
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setTimeout(applyPayload, 80), { once: true });
  } else {
    setTimeout(applyPayload, 80);
  }
})();
