import { describe, expect, it } from 'vitest';
import {
  CLOUDINARY_FREE_MAX_BYTES,
  SHARE_UPLOAD_TARGET_BYTES,
  replaceExtension,
} from './shareImageOptimization';

describe('share image optimization', () => {
  it('keeps the upload target safely below the Cloudinary limit', () => {
    expect(SHARE_UPLOAD_TARGET_BYTES).toBe(3 * 1024 * 1024);
    expect(SHARE_UPLOAD_TARGET_BYTES).toBeLessThan(CLOUDINARY_FREE_MAX_BYTES);
  });

  it('changes the encoded filename to JPEG', () => {
    expect(replaceExtension('photobooth.png', '.jpg')).toBe('photobooth.jpg');
    expect(replaceExtension('retro.photo.PNG', '.jpg')).toBe('retro.photo.jpg');
  });
});
