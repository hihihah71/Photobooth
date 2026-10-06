import { describe, expect, it } from 'vitest';
import {
  MAX_IMAGE_FILE_BYTES,
  validateImageBlob,
  validateImageDimensions,
} from './imageValidation';

describe('image validation', () => {
  it('rejects empty and oversized files', () => {
    expect(() => validateImageBlob(new Blob([], { type: 'image/png' }))).toThrow('empty');

    const oversized = new Blob(
      [new Uint8Array(MAX_IMAGE_FILE_BYTES + 1)],
      { type: 'image/png' },
    );
    expect(() => validateImageBlob(oversized)).toThrow('too large');
  });

  it('rejects a declared non-image MIME type', () => {
    const text = new Blob(['not an image'], { type: 'text/plain' });
    expect(() => validateImageBlob(text)).toThrow('not a supported image');
  });

  it('rejects decoded images beyond the pixel budget', () => {
    expect(() =>
      validateImageDimensions(
        { naturalWidth: 6000, naturalHeight: 5000 },
        { maxPixels: 24_000_000 },
      ),
    ).toThrow('dimensions are too large');
  });

  it('accepts a normal decoded image', () => {
    expect(() =>
      validateImageDimensions({ naturalWidth: 1920, naturalHeight: 1080 }),
    ).not.toThrow();
  });
});
