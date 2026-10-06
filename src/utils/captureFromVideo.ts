export function captureFromVideo(
  video: HTMLVideoElement,
  options: {
    mirror?: boolean;
    quality?: number;
    targetAspect?: number;
  } = {},
): Promise<Blob> {
  const { mirror = false, quality = 0.92, targetAspect } = options;
  const srcW = video.videoWidth;
  const srcH = video.videoHeight;
  if (!srcW || !srcH) {
    return Promise.reject(new Error('Video has no dimensions yet'));
  }

  // A different target aspect requires cropping, not pixel rotation. Browsers
  // already expose the video frame in its display orientation.
  // This lets capture pre-align with the slot so cover-fit becomes a no-op.
  let cropW = srcW;
  let cropH = srcH;
  let cropX = 0;
  let cropY = 0;
  if (targetAspect && targetAspect > 0) {
    const srcAspect = srcW / srcH;
    if (srcAspect > targetAspect) {
      cropW = srcH * targetAspect;
      cropX = (srcW - cropW) / 2;
    } else {
      cropH = srcW / targetAspect;
      cropY = (srcH - cropH) / 2;
    }
  }

  const canvas = document.createElement('canvas');
  canvas.width = Math.round(cropW);
  canvas.height = Math.round(cropH);
  const ctx = canvas.getContext('2d');
  if (!ctx) return Promise.reject(new Error('Canvas 2D context unavailable'));

  if (mirror) {
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
  }
  ctx.drawImage(video, cropX, cropY, cropW, cropH, 0, 0, canvas.width, canvas.height);

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Failed to encode captured frame'));
      },
      'image/jpeg',
      quality,
    );
  });
}
