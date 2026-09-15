(() => {
  const DB_NAME = 'operational-plan-pwa-v2';
  const DB_VERSION = 1;

  const openDB = () => new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains('settings')) db.createObjectStore('settings', { keyPath: 'id' });
      if (!db.objectStoreNames.contains('schools')) db.createObjectStore('schools', { keyPath: 'id' });
      if (!db.objectStoreNames.contains('plans')) {
        const store = db.createObjectStore('plans', { keyPath: 'id' });
        store.createIndex('schoolId', 'schoolId', { unique: false });
      }
      if (!db.objectStoreNames.contains('events')) {
        const store = db.createObjectStore('events', { keyPath: 'id' });
        store.createIndex('planId', 'planId', { unique: false });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

  const tx = async (storeName, mode, runner) => {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, mode);
      const store = transaction.objectStore(storeName);
      let value;
      try { value = runner(store); } catch (error) { reject(error); return; }
      transaction.oncomplete = () => resolve(value);
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error || new Error('Transaction aborted'));
    });
  };

  const requestToPromise = request => new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

  const api = {
    async get(store, id) {
      const db = await openDB();
      const transaction = db.transaction(store, 'readonly');
      return requestToPromise(transaction.objectStore(store).get(id));
    },
    async getAll(store) {
      const db = await openDB();
      const transaction = db.transaction(store, 'readonly');
      return requestToPromise(transaction.objectStore(store).getAll());
    },
    async put(store, value) {
      const db = await openDB();
      const transaction = db.transaction(store, 'readwrite');
      await requestToPromise(transaction.objectStore(store).put(value));
      return value;
    },
    async remove(store, id) {
      const db = await openDB();
      const transaction = db.transaction(store, 'readwrite');
      await requestToPromise(transaction.objectStore(store).delete(id));
    },
    async getByIndex(store, index, key) {
      const db = await openDB();
      const transaction = db.transaction(store, 'readonly');
      return requestToPromise(transaction.objectStore(store).index(index).getAll(key));
    },
    id(prefix) {
      return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
    },
    async ensureSeed() {
      let settings = await api.get('settings', 'app-settings');
      const schools = await api.getAll('schools');
      if (schools.length) {
        if (!settings) {
          settings = { id: 'app-settings', schemaVersion: 2, activeSchoolId: schools[0].id, theme: 'system', preferredCalendar: 'both' };
          await api.put('settings', settings);
        }
        return;
      }

      const school = {
        id: 'school_abu_sulaa',
        name: 'مجمع أبو السلع الابتدائي والمتوسط',
        shortName: 'مجمع أبو السلع',
        schoolType: 'complex',
        educationRegion: 'جازان',
        educationOffice: '',
        isArchived: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      await api.put('schools', school);

      const plan = {
        id: 'plan_1448_term1',
        schoolId: school.id,
        name: 'الخطة التشغيلية',
        academicYear: '1448 هـ',
        term: '1',
        weeksCount: 19,
        startDate: '2026-08-23',
        status: 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      await api.put('plans', plan);

      settings = { id: 'app-settings', schemaVersion: 2, activeSchoolId: school.id, theme: 'system', preferredCalendar: 'both' };
      await api.put('settings', settings);
    },
    async exportAll() {
      const [settings, schools, plans, events] = await Promise.all([
        api.getAll('settings'), api.getAll('schools'), api.getAll('plans'), api.getAll('events')
      ]);
      return { schemaVersion: 2, exportedAt: new Date().toISOString(), settings, schools, plans, events };
    },
    async importAll(payload) {
      if (!payload || payload.schemaVersion !== 2) throw new Error('نسخة احتياطية غير متوافقة');
      const db = await openDB();
      const names = ['settings', 'schools', 'plans', 'events'];
      for (const name of names) {
        await new Promise((resolve, reject) => {
          const t = db.transaction(name, 'readwrite');
          const store = t.objectStore(name);
          store.clear();
          for (const item of payload[name] || []) store.put(item);
          t.oncomplete = resolve;
          t.onerror = () => reject(t.error);
        });
      }
    }
  };

  window.PlanDB = api;
})();
