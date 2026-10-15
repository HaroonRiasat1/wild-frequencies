// The headliner track lives in this browser's IndexedDB only — it is never
// copied into the project, the build, or anywhere else.

const DB = 'wild-frequencies';
const STORE = 'headliner';

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function tx<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await open();
  return new Promise((resolve, reject) => {
    const r = fn(db.transaction(STORE, mode).objectStore(STORE));
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}

export async function saveHeadliner(file: File): Promise<void> {
  await tx('readwrite', (s) => s.put(file, 'track'));
}

export async function loadHeadliner(): Promise<File | null> {
  try {
    return ((await tx('readonly', (s) => s.get('track'))) as File | undefined) ?? null;
  } catch {
    return null;
  }
}

export async function clearHeadliner(): Promise<void> {
  await tx('readwrite', (s) => s.delete('track'));
}
