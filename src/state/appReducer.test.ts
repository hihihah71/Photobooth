import { describe, expect, it } from 'vitest';
import type { AppState, SlotImage } from '../types';
import { appReducer, initialState } from './appReducer';

const photo: SlotImage = {
  image: {} as HTMLImageElement,
  sourceUrl: 'blob:test-photo',
  transform: { offsetX: 0, offsetY: 0, scale: 1 },
};

describe('appReducer frame swaps', () => {
  it('changes the photo filter', () => {
    const next = appReducer(initialState, { type: 'setPhotoFilter', filter: 'soft' });
    expect(next.photoFilter).toBe('soft');
  });

  it('selects the first empty slot when switching to a larger frame', () => {
    const state: AppState = {
      step: 'adjust',
      frameId: 'one-slot',
      slotImages: [photo],
      activeSlot: 0,
      photoFilter: 'natural',
    };

    const next = appReducer(state, {
      type: 'swapFrame',
      frameId: 'three-slots',
      slotCount: 3,
    });

    expect(next.slotImages).toEqual([photo, null, null]);
    expect(next.activeSlot).toBe(1);
  });

  it('preserves hidden tail photos when switching to a smaller frame', () => {
    const state: AppState = {
      step: 'adjust',
      frameId: 'three-slots',
      slotImages: [photo, photo, photo],
      activeSlot: 2,
      photoFilter: 'warm',
    };

    const next = appReducer(state, {
      type: 'swapFrame',
      frameId: 'one-slot',
      slotCount: 1,
    });

    expect(next.slotImages).toHaveLength(3);
    expect(next.slotImages).toEqual([photo, photo, photo]);
    expect(next.activeSlot).toBe(0);
    expect(next.photoFilter).toBe('warm');
  });

  it('resets the complete capture state', () => {
    const dirty: AppState = {
      step: 'preview',
      frameId: 'frame',
      slotImages: [photo],
      activeSlot: 0,
      photoFilter: 'vivid',
    };

    expect(appReducer(dirty, { type: 'reset' })).toBe(initialState);
  });
});
