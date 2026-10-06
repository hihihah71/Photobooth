import { fileToImage } from './fileToImage';

export const MAX_IMAGE_FILE_BYTES = 20 * 1024 * 1024;
export const MAX_IMAGE_DIMENSION = 8192;
export const MAX_IMAGE_PIXELS = 24_000_000;
export const MAX_CUSTOM_FRAME_PIXELS = 16_000_000;

type ImageLimits = {
  maxBytes?: number;
  maxDimension?: number;
  maxPixels?: number;
};

export function validateImageBlob(
  blob: Blob,
  { maxBytes = MAX_IMAGE_FILE_BYTES }: ImageLimits = {},
): void {
  if (blob.size <= 0) throw new Error('The selected image is empty.');
  if (blob.size > maxBytes) {
    throw new Error(`Image is too large. Maximum file size is ${formatMiB(maxBytes)} MB.`);
  }
  if (blob.type && !blob.type.toLowerCase().startsWith('image/')) {
    throw new Error('The selected file is not a supported image.');
  }
}

export function validateImageDimensions(
  image: Pick<HTMLImageElement, 'naturalWidth' | 'naturalHeight'>,
  {
    maxDimension = MAX_IMAGE_DIMENSION,
    maxPixels = MAX_IMAGE_PIXELS,
  }: ImageLimits = {},
): void {
  const { naturalWidth: width, naturalHeight: height } = image;
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    throw new Error('The selected image has invalid dimensions.');
  }
  if (width > maxDimension || height > maxDimension || width * height > maxPixels) {
    throw new Error(
      `Image dimensions are too large. Maximum is ${maxDimension}px per side and ${maxPixels.toLocaleString()} total pixels.`,
    );
  }
}

export async function loadValidatedImage(
  blob: Blob,
  limits: ImageLimits = {},
): Promise<HTMLImageElement> {
  validateImageBlob(blob, limits);
  const image = await fileToImage(blob);
  validateImageDimensions(image, limits);
  return image;
}

function formatMiB(bytes: number): number {
  return Math.round(bytes / (1024 * 1024));
}
