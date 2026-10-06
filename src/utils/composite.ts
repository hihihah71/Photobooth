import type { FrameConfig, PhotoFilterId, SlotImage } from '../types';
import { getPhotoFilter } from '../config/photoFilters';
import { computeCoverSource } from './coverFit';
import { fileToImage } from './fileToImage';

/**
 * Render the final composite onto `canvas` and resolve to a PNG Blob.
 *
 * Layer order: background → slot images (clipped, optionally rotated) →
 * decorations → overlay PNG on top.
 */
export async function drawComposite(
  canvas: HTMLCanvasElement,
  frame: FrameConfig,
  slotImages: (SlotImage | null)[],
  photoFilter: PhotoFilterId,
): Promise<Blob> {
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context unavailable');

  const { width, height } = frame.output;
  canvas.width = width;
  canvas.height = height;

  await drawBackground(ctx, frame, width, height);

  frame.slots.forEach((slot, i) => {
    const slotImage = slotImages[i];
    if (!slotImage) return;

    ctx.save();
    if (slot.rotation) {
      const cx = slot.x + slot.width / 2;
      const cy = slot.y + slot.height / 2;
      ctx.translate(cx, cy);
      ctx.rotate((slot.rotation * Math.PI) / 180);
      ctx.translate(-cx, -cy);
    }
    ctx.beginPath();
    ctx.rect(slot.x, slot.y, slot.width, slot.height);
    ctx.clip();
    ctx.filter = getPhotoFilter(photoFilter).css;

    const src = computeCoverSource(
      slotImage.image.naturalWidth,
      slotImage.image.naturalHeight,
      slot.width,
      slot.height,
      slotImage.transform,
    );
    ctx.drawImage(
      slotImage.image,
      src.sx,
      src.sy,
      src.sWidth,
      src.sHeight,
      slot.x,
      slot.y,
      slot.width,
      slot.height,
    );

    ctx.restore();
  });

  if (frame.decorations) {
    for (const deco of frame.decorations) {
      const img = await fileToImage(deco.image);
      ctx.save();
      if (deco.rotation) {
        const cx = deco.x + deco.width / 2;
        const cy = deco.y + deco.height / 2;
        ctx.translate(cx, cy);
        ctx.rotate((deco.rotation * Math.PI) / 180);
        ctx.translate(-cx, -cy);
      }
      ctx.drawImage(img, deco.x, deco.y, deco.width, deco.height);
      ctx.restore();
    }
  }

  if (frame.overlay) {
    const overlay = await fileToImage(frame.overlay);
    ctx.drawImage(overlay, 0, 0, width, height);
  }

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Failed to encode composite'));
      },
      'image/png',
    );
  });
}

async function drawBackground(
  ctx: CanvasRenderingContext2D,
  frame: FrameConfig,
  width: number,
  height: number,
): Promise<void> {
  const bg = frame.background;
  if (!bg) {
    ctx.clearRect(0, 0, width, height);
    return;
  }
  if ('color' in bg) {
    ctx.fillStyle = bg.color;
    ctx.fillRect(0, 0, width, height);
    return;
  }
  const img = await fileToImage(bg.image);
  ctx.drawImage(img, 0, 0, width, height);
}
