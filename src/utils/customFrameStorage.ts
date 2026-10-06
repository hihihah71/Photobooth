import type { CustomFrame } from '../types';
import { FRAMES_INDEX, STORE_FRAMES, withStore } from './db';

export const MAX_CUSTOM_FRAMES = 20;
export const MAX_CUSTOM_FRAME_STORAGE_BYTES = 100 * 1024 * 1024;

export async function saveCustomFrame(frame: CustomFrame): Promise<void> {
  const existing = await listCustomFrames();
  const previous = existing.find((item) => item.id === frame.id);
  const nextCount = existing.length + (previous ? 0 : 1);
  const currentBytes = existing.reduce(
    (total, item) => total + item.background.size + item.thumbnail.size,
    0,
  );
  const frameBytes = frame.background.size + frame.thumbnail.size;
  const nextBytes = currentBytes
    - (previous?.background.size ?? 0)
    - (previous?.thumbnail.size ?? 0)
    + frameBytes;

  if (nextCount > MAX_CUSTOM_FRAMES) {
    throw new Error(`Custom frame limit reached (${MAX_CUSTOM_FRAMES} frames). Delete one first.`);
  }
  if (nextBytes > MAX_CUSTOM_FRAME_STORAGE_BYTES) {
    throw new Error('Custom frame storage limit reached (100 MB). Delete an older frame first.');
  }

  await withStore(STORE_FRAMES, 'readwrite', (s) => s.put(frame));
}

export function listCustomFrames(): Promise<CustomFrame[]> {
  return withStore(STORE_FRAMES, 'readonly', (s) => {
    const index = s.index(FRAMES_INDEX);
    return new Promise<CustomFrame[]>((resolve, reject) => {
      const items: CustomFrame[] = [];
      const cursorReq = index.openCursor(null, 'prev');
      cursorReq.onsuccess = () => {
        const cursor = cursorReq.result;
        if (cursor) {
          items.push(cursor.value as CustomFrame);
          cursor.continue();
        } else {
          resolve(items);
        }
      };
      cursorReq.onerror = () => reject(cursorReq.error);
    });
  });
}

export function getCustomFrame(id: string): Promise<CustomFrame | undefined> {
  return withStore(STORE_FRAMES, 'readonly', (s) =>
    s.get(id) as IDBRequest<CustomFrame | undefined>,
  );
}

export function deleteCustomFrame(id: string): Promise<void> {
  return withStore(STORE_FRAMES, 'readwrite', (s) => s.delete(id)).then(() => undefined);
}
