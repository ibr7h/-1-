(() => {
  const DB_NAME = 'operational-plan-pwa-v2';
  const DB_VERSION = 2;
  const STORES = ['settings', 'schools', 'plans', 'weeks', 'events', 'staff', 'assets'];

  const openDB = () => new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;

      if (!db.objectStoreNames.contains('settings')) {
        db.createObjectStore('settings', { keyPath: 'id' });
      }

      if (!db.objectStoreNames.contains('schools')) {
        const store = db.createObjectStore('schools', { keyPath: 'id' });
        store.createIndex('isArchived', 'isArchived', { unique: false });
      }

      if (!db.objectStoreNames.contains('plans')) {
        const store = db.createObjectStore('plans', { keyPath: 'id' });
        store.createIndex('schoolId', 'schoolId', { unique: false });
        store.createIndex('status', 'status', { unique: false });
      }

      if (!db.objectStoreNames.contains('weeks')) {
        const store = db.createObjectStore('weeks', { keyPath: 'id' });
        store.createIndex('planId', 'planId', { unique: false });
        store.createIndex('schoolId', 'schoolId', { unique: false });
      }

      if (!db.objectStoreNames.contains('events')) {
        const store = db.createObjectStore('events', { keyPath: 'id' });
        store.createIndex('planId', 'planId', { unique: false });
        store.createIndex('schoolId', 'schoolId', { unique: false });
        store.createIndex('type', 'type', { unique: false });
      }

      if (!db.objectStoreNames.contains('staff')) {
        const store = db.createObjectStore('staff', { keyPath: 'id' });
        store.createIndex('schoolId', 'schoolId', { unique: false });
        store.createIndex('role', 'role', { unique: false });
      }

      if (!db.objectStoreNames.contains('assets')) {
        const store = db.createObjectStore('assets', { keyPath: 'id' });
        store.createIndex('schoolId', 'schoolId', { unique: false });
        store.createIndex('kind', 'kind', { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

  const requestToPromise = request => new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

  async function clearAndFill(storeName, values) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      store.clear();
      for (const value of values || []) store.put(value);
      transaction.oncomplete = resolve;
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error || new Error('Transaction aborted'));
    });
  }

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
      if (globalThis.crypto?.randomUUID) return `${prefix}_${crypto.randomUUID()}`;
      return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
    },

    async ensureSeed() {
      let settings = await api.get('settings', 'app-settings');
      if (!settings) {
        settings = {
          id: 'app-settings',
          schemaVersion: 2,
          activeSchoolId: null,
          preferredCalendar: 'both',
          theme: 'system',
          uiScale: 'normal',
          firstRunCompleted: false,
          lastBackupAt: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        await api.put('settings', settings);
      }

      const schools = await api.getAll('schools');
      if (settings.activeSchoolId && !schools.some(s => s.id === settings.activeSchoolId && !s.isArchived)) {
        settings.activeSchoolId = schools.find(s => !s.isArchived)?.id || null;
        settings.updatedAt = new Date().toISOString();
        await api.put('settings', settings);
      }
    },

    async exportAll() {
      const payload = {
        schemaVersion: 2,
        app: 'operational-plan-pwa-v2',
        exportedAt: new Date().toISOString()
      };

      for (const store of STORES) {
        payload[store] = await api.getAll(store);
      }

      const settings = payload.settings.find(item => item.id === 'app-settings');
      if (settings) {
        settings.lastBackupAt = payload.exportedAt;
        await api.put('settings', settings);
      }

      return payload;
    },

    async importAll(payload) {
      if (!payload || Number(payload.schemaVersion) !== 2) {
        throw new Error('نسخة احتياطية غير متوافقة مع الإصدار الحالي');
      }

      if (!Array.isArray(payload.schools) || !Array.isArray(payload.plans)) {
        throw new Error('ملف النسخة الاحتياطية غير مكتمل');
      }

      for (const store of STORES) {
        await clearAndFill(store, payload[store] || []);
      }

      await api.ensureSeed();
    },

    async archiveSchool(schoolId) {
      const school = await api.get('schools', schoolId);
      if (!school) return;
      school.isArchived = true;
      school.updatedAt = new Date().toISOString();
      await api.put('schools', school);

      const settings = await api.get('settings', 'app-settings');
      if (settings?.activeSchoolId === schoolId) {
        const schools = (await api.getAll('schools')).filter(s => !s.isArchived && s.id !== schoolId);
        settings.activeSchoolId = schools[0]?.id || null;
        settings.updatedAt = new Date().toISOString();
        await api.put('settings', settings);
      }
    }
  };

  window.PlanDB = api;
})();