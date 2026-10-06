import type { SavedPhoto } from '../types';
import { PHOTOS_INDEX, STORE_PHOTOS, withStore } from './db';

export const MAX_SAVED_PHOTOS = 100;
export const MAX_SAVED_PHOTO_BYTES = 25 * 1024 * 1024;
export const MAX_GALLERY_BYTES = 250 * 1024 * 1024;

export async function savePhoto(photo: SavedPhoto): Promise<void> {
  const photoBytes = photo.blob.size + photo.thumbnail.size;
  if (photoBytes > MAX_SAVED_PHOTO_BYTES) {
    throw new Error('This photo is too large to save locally. Download it instead.');
  }

  const existing = await listPhotos();
  const previous = existing.find((item) => item.id === photo.id);
  const nextCount = existing.length + (previous ? 0 : 1);
  const currentBytes = existing.reduce(
    (total, item) => total + item.blob.size + item.thumbnail.size,
    0,
  );
  const nextBytes = currentBytes - (previous?.blob.size ?? 0) - (previous?.thumbnail.size ?? 0) + photoBytes;

  if (nextCount > MAX_SAVED_PHOTOS) {
    throw new Error(`Gallery limit reached (${MAX_SAVED_PHOTOS} photos). Delete older photos first.`);
  }
  if (nextBytes > MAX_GALLERY_BYTES) {
    throw new Error('Gallery storage limit reached (250 MB). Delete older photos first.');
  }

  await withStore(STORE_PHOTOS, 'readwrite', (s) => s.put(photo));
}

export function listPhotos(): Promise<SavedPhoto[]> {
  return withStore(STORE_PHOTOS, 'readonly', (s) => {
    const index = s.index(PHOTOS_INDEX);
    return new Promise<SavedPhoto[]>((resolve, reject) => {
      const items: SavedPhoto[] = [];
      const cursorReq = index.openCursor(null, 'prev');
      cursorReq.onsuccess = () => {
        const cursor = cursorReq.result;
        if (cursor) {
          items.push(cursor.value as SavedPhoto);
          cursor.continue();
        } else {
          resolve(items);
        }
      };
      cursorReq.onerror = () => reject(cursorReq.error);
    });
  });
}

export function getPhoto(id: string): Promise<SavedPhoto | undefined> {
  return withStore(STORE_PHOTOS, 'readonly', (s) =>
    s.get(id) as IDBRequest<SavedPhoto | undefined>,
  );
}

export function deletePhoto(id: string): Promise<void> {
  return withStore(STORE_PHOTOS, 'readwrite', (s) => s.delete(id)).then(() => undefined);
}

export function clearAll(): Promise<void> {
  return withStore(STORE_PHOTOS, 'readwrite', (s) => s.clear()).then(() => undefined);
}

export async function estimateUsage(): Promise<{ usage: number; quota: number } | null> {
  if (!navigator.storage?.estimate) return null;
  const est = await navigator.storage.estimate();
  return { usage: est.usage ?? 0, quota: est.quota ?? 0 };
}
