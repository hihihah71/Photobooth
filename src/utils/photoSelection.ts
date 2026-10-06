export const MAX_CAPTURE_PHOTOS = 6;

/** Toggle a photo while preserving the order in which photos were selected. */
export function togglePhotoSelection(
  selectedIds: string[],
  id: string,
  requiredCount: number,
): string[] {
  if (selectedIds.includes(id)) return selectedIds.filter((selectedId) => selectedId !== id);
  if (selectedIds.length >= requiredCount) return selectedIds;
  return [...selectedIds, id];
}
