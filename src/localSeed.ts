const DB_NAME = 'pb-bilibili-162-local-db';
const DB_VERSION = 1;
const STORE_NAME = 'tables';
const SEED_VERSION_KEY = '__seed_version__';

function openSeedDb() {
  if (typeof window === 'undefined' || typeof indexedDB === 'undefined') return Promise.resolve(null);
  return new Promise((resolve) => {
    try {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) db.createObjectStore(STORE_NAME);
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

async function seedLocalDb() {
  const db = await openSeedDb();
  if (!db) return;
  try {
    const current = await new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const req = tx.objectStore(STORE_NAME).get(SEED_VERSION_KEY);
      req.onsuccess = () => resolve(req.result || 0);
      req.onerror = () => resolve(0);
    });

    const response = await fetch(`/local_seed.json?v=${Date.now()}`, { cache: 'no-store' });
    if (!response.ok) return;
    const seed = await response.json();
    if (!seed?.tables || seed.version <= current) return;

    await new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      for (const [table, rows] of Object.entries(seed.tables)) {
        if (Array.isArray(rows)) store.put(rows, table);
      }
      store.put(seed.version, SEED_VERSION_KEY);
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
    });
    window.dispatchEvent(new CustomEvent('local-db-seeded', { detail: { tables: Object.keys(seed.tables) } }));
  } catch (error) {
    console.warn('[local-db] Seed load skipped:', error);
  }
}

void seedLocalDb();
