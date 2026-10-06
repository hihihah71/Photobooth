import { fileToImage } from './fileToImage';

/** Cloudinary Free currently rejects image uploads above 10 MiB. */
export const CLOUDINARY_FREE_MAX_BYTES = 10 * 1024 * 1024;
/** Keep QR-share uploads quick on mobile while retaining good print/view quality. */
export const SHARE_UPLOAD_TARGET_BYTES = 3 * 1024 * 1024;

export type PreparedShareImage = {
  blob: Blob;
  filename: string;
  optimized: boolean;
};

export async function prepareShareImage(
  source: Blob,
  filename: string,
): Promise<PreparedShareImage> {
  if (source.size <= SHARE_UPLOAD_TARGET_BYTES) {
    return { blob: source, filename, optimized: false };
  }

  const image = await fileToImage(source);
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Canvas 2D context unavailable while optimizing the share image.');

  let width = image.naturalWidth;
  let height = image.naturalHeight;
  const qualities = [0.92, 0.86, 0.8, 0.74, 0.68, 0.6];
  let encoded: Blob | null = null;

  drawAtSize(canvas, context, image, width, height);
  for (const quality of qualities) {
    encoded = await encodeJpeg(canvas, quality);
    if (encoded.size <= SHARE_UPLOAD_TARGET_BYTES) {
      return asPreparedJpeg(encoded, filename);
    }
  }

  // Extremely detailed images can still be large after quality compression.
  // Reduce dimensions proportionally, while keeping as much resolution as possible.
  for (let attempt = 0; attempt < 4 && encoded; attempt += 1) {
    const ratio = Math.min(0.9, Math.sqrt(SHARE_UPLOAD_TARGET_BYTES / encoded.size) * 0.95);
    width = Math.max(1, Math.round(width * ratio));
    height = Math.max(1, Math.round(height * ratio));
    drawAtSize(canvas, context, image, width, height);
    encoded = await encodeJpeg(canvas, 0.82);
    if (encoded.size <= SHARE_UPLOAD_TARGET_BYTES) {
      return asPreparedJpeg(encoded, filename);
    }
  }

  throw new Error('The photo is still too large to share after optimization.');
}

function drawAtSize(
  canvas: HTMLCanvasElement,
  context: CanvasRenderingContext2D,
  image: HTMLImageElement,
  width: number,
  height: number,
): void {
  canvas.width = width;
  canvas.height = height;
  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, width, height);
  context.drawImage(image, 0, 0, width, height);
}

function encodeJpeg(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Failed to optimize the photo for sharing.'));
      },
      'image/jpeg',
      quality,
    );
  });
}

function asPreparedJpeg(blob: Blob, filename: string): PreparedShareImage {
  return {
    blob,
    filename: replaceExtension(filename, '.jpg'),
    optimized: true,
  };
}

export function replaceExtension(filename: string, extension: string): string {
  const base = filename.replace(/\.[^.]*$/, '') || 'photobooth';
  return `${base}${extension}`;
}
