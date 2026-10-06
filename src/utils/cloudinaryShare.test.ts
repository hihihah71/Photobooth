import { describe, expect, it } from 'vitest';
import { makeCloudinaryAttachmentUrl } from './cloudinaryShare';

describe('makeCloudinaryAttachmentUrl', () => {
  it('creates a forced-download delivery URL', () => {
    expect(makeCloudinaryAttachmentUrl(
      'https://res.cloudinary.com/demo/image/upload/v123/photo.png',
      'photobooth-retro.png',
    )).toBe(
      'https://res.cloudinary.com/demo/image/upload/fl_attachment:photobooth-retro/v123/photo.png',
    );
  });

  it('sanitizes the download filename', () => {
    expect(makeCloudinaryAttachmentUrl(
      'https://res.cloudinary.com/demo/image/upload/v123/photo.png',
      'My photo (final).png',
    )).toContain('/fl_attachment:My-photo--final-/');
  });

  it('leaves an unknown URL shape unchanged', () => {
    const url = 'https://example.com/photo.png';
    expect(makeCloudinaryAttachmentUrl(url, 'photo.png')).toBe(url);
  });
});
