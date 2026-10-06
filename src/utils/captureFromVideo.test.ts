import { describe, expect, it } from 'vitest';
import { getCaptureRotation } from './captureFromVideo';

describe('getCaptureRotation', () => {
  it('does not rotate when stream and target orientations match', () => {
    expect(getCaptureRotation(1920, 1080, 16 / 9, 90)).toBe(0);
    expect(getCaptureRotation(1080, 1920, 3 / 4, 0)).toBe(0);
  });

  it('rotates a stale portrait stream for landscape capture', () => {
    expect(getCaptureRotation(1080, 1920, 16 / 9, 90)).toBe(90);
    expect(getCaptureRotation(1080, 1920, 16 / 9, 270)).toBe(-90);
  });

  it('rotates a stale landscape stream for portrait capture', () => {
    expect(getCaptureRotation(1920, 1080, 3 / 4, 0)).toBe(90);
  });
});
