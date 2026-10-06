import { describe, expect, it } from 'vitest';
import { DEFAULT_PHOTO_FILTER, getPhotoFilter, photoFilters } from './photoFilters';

describe('photo filters', () => {
  it('provides the five beautify presets', () => {
    expect(photoFilters.map((filter) => filter.id)).toEqual([
      'natural',
      'bright',
      'warm',
      'soft',
      'vivid',
    ]);
  });

  it('uses Natural by default', () => {
    expect(DEFAULT_PHOTO_FILTER).toBe('natural');
    expect(getPhotoFilter(DEFAULT_PHOTO_FILTER).name).toBe('Natural');
  });
});
