import { describe, expect, it } from 'vitest';
import { MAX_CAPTURE_PHOTOS, togglePhotoSelection } from './photoSelection';

describe('photo selection', () => {
  it('keeps selection order for slot assignment', () => {
    let selected: string[] = [];
    selected = togglePhotoSelection(selected, 'photo-b', 3);
    selected = togglePhotoSelection(selected, 'photo-a', 3);
    selected = togglePhotoSelection(selected, 'photo-c', 3);
    expect(selected).toEqual(['photo-b', 'photo-a', 'photo-c']);
  });

  it('does not select more photos than the frame requires', () => {
    const selected = ['one', 'two'];
    expect(togglePhotoSelection(selected, 'three', 2)).toBe(selected);
  });

  it('allows a selected photo to be deselected', () => {
    expect(togglePhotoSelection(['one', 'two'], 'one', 2)).toEqual(['two']);
  });

  it('caps a capture session at six photos', () => {
    expect(MAX_CAPTURE_PHOTOS).toBe(6);
  });
});
