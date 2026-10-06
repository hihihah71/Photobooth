import { useEffect, useRef } from 'react';
import type { SlotImage } from '../types';

const REVOKE_DELAY_MS = 1500;

/** Revoke object URLs shortly after their slot image leaves application state. */
export function useSlotImageUrlCleanup(slotImages: (SlotImage | null)[]): void {
  const previousUrlsRef = useRef<Set<string>>(new Set());
  const timersRef = useRef<Map<string, number>>(new Map());

  useEffect(() => {
    const currentUrls = new Set(
      slotImages
        .map((slotImage) => slotImage?.sourceUrl)
        .filter((url): url is string => Boolean(url)),
    );

    // Cancel a delayed revoke when React StrictMode immediately replays the
    // effect, or when a URL becomes active again before the delay expires.
    for (const url of currentUrls) {
      const timer = timersRef.current.get(url);
      if (timer !== undefined) {
        window.clearTimeout(timer);
        timersRef.current.delete(url);
      }
    }
    for (const url of previousUrlsRef.current) {
      if (!currentUrls.has(url)) scheduleRevoke(url, timersRef.current);
    }
    previousUrlsRef.current = currentUrls;
  }, [slotImages]);

  useEffect(
    () => () => {
      for (const url of previousUrlsRef.current) {
        scheduleRevoke(url, timersRef.current);
      }
      previousUrlsRef.current.clear();
    },
    [],
  );
}

function scheduleRevoke(url: string, timers: Map<string, number>): void {
  if (timers.has(url)) return;
  const timer = window.setTimeout(() => {
    URL.revokeObjectURL(url);
    timers.delete(url);
  }, REVOKE_DELAY_MS);
  timers.set(url, timer);
}
