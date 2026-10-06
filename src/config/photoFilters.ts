import type { PhotoFilterId } from '../types';

export type PhotoFilter = {
  id: PhotoFilterId;
  name: string;
  description: string;
  css: string;
};

export const DEFAULT_PHOTO_FILTER: PhotoFilterId = 'natural';

export const photoFilters: readonly PhotoFilter[] = [
  {
    id: 'natural',
    name: 'Natural',
    description: 'Balanced and lightly polished',
    css: 'brightness(1.04) contrast(1.03) saturate(1.04)',
  },
  {
    id: 'bright',
    name: 'Bright',
    description: 'Lifts photos taken in low light',
    css: 'brightness(1.08) contrast(1.02) saturate(1.03)',
  },
  {
    id: 'warm',
    name: 'Warm',
    description: 'Adds a gentle golden tone',
    css: 'brightness(1.05) contrast(1.03) saturate(1.06) sepia(0.08)',
  },
  {
    id: 'soft',
    name: 'Soft',
    description: 'Softer highlights and skin tones',
    css: 'brightness(1.06) contrast(0.97) saturate(1.02)',
  },
  {
    id: 'vivid',
    name: 'Vivid',
    description: 'More color without looking artificial',
    css: 'brightness(1.04) contrast(1.07) saturate(1.10)',
  },
] as const;

export function getPhotoFilter(id: PhotoFilterId): PhotoFilter {
  return photoFilters.find((filter) => filter.id === id) ?? photoFilters[0];
}
