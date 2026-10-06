export const DB_NAME = 'photobooth';
export const DB_VERSION = 2;
export const STORE_PHOTOS = 'photos';
export const STORE_FRAMES = 'frames';
export const PHOTOS_INDEX = 'by_createdAt';
export const FRAMES_INDEX = 'by_createdAt';

let dbPromise: Promise<IDBDatabase> | null = null;

export function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  if (typeof indexedDB === 'undefined') {
    return Promise.reject(new Error('IndexedDB is not available in this browser'));
  }
  const opening = new Promise<IDBDatabase>((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_PHOTOS)) {
        const photos = db.createObjectStore(STORE_PHOTOS, { keyPath: 'id' });
        photos.createIndex(PHOTOS_INDEX, 'createdAt');
      }
      if (!db.objectStoreNames.contains(STORE_FRAMES)) {
        const frames = db.createObjectStore(STORE_FRAMES, { keyPath: 'id' });
        frames.createIndex(FRAMES_INDEX, 'createdAt');
      }
    };
    req.onsuccess = () => {
      const db = req.result;
      db.onversionchange = () => {
        db.close();
        dbPromise = null;
      };
      resolve(db);
    };
    req.onerror = () => reject(req.error ?? new Error('IndexedDB open failed'));
  });
  dbPromise = opening.catch((error: unknown) => {
    dbPromise = null;
    throw error;
  });
  return dbPromise;
}

export function withStore<T>(
  store: string,
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => IDBRequest<T> | Promise<T>,
): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const tx = db.transaction(store, mode);
        const s = tx.objectStore(store);
        let resultReady = false;
        let transactionComplete = false;
        let value: T;
        let failed = false;

        const fail = (error: unknown) => {
          if (failed) return;
          failed = true;
          reject(error instanceof Error ? error : new Error('IndexedDB transaction failed'));
        };
        const finish = () => {
          if (!failed && resultReady && transactionComplete) resolve(value);
        };

        tx.oncomplete = () => {
          transactionComplete = true;
          finish();
        };
        tx.onerror = () => fail(tx.error ?? new Error('IndexedDB transaction failed'));
        tx.onabort = () => fail(tx.error ?? new Error('IndexedDB transaction aborted'));

        let result: IDBRequest<T> | Promise<T>;
        try {
          result = fn(s);
        } catch (error) {
          try {
            tx.abort();
          } catch {
            // The transaction may already be inactive.
          }
          fail(error);
          return;
        }

        if (result instanceof Promise) {
          result.then(
            (next) => {
              value = next;
              resultReady = true;
              finish();
            },
            (error: unknown) => {
              try {
                tx.abort();
              } catch {
                // The transaction may already be inactive.
              }
              fail(error);
            },
          );
        } else {
          result.onsuccess = () => {
            value = result.result;
            resultReady = true;
            finish();
          };
          result.onerror = () => fail(result.error ?? new Error('IndexedDB request failed'));
        }
      }),
  );
}
