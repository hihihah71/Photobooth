export function captureFromVideo(
  video: HTMLVideoElement,
  options: {
    mirror?: boolean;
    quality?: number;
    targetAspect?: number;
    outputRotation?: 0 | 90 | -90;
  } = {},
): Promise<Blob> {
  const { mirror = false, quality = 0.92, targetAspect, outputRotation = 0 } = options;
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

  let outputCanvas = canvas;
  if (outputRotation !== 0) {
    outputCanvas = document.createElement('canvas');
    outputCanvas.width = canvas.height;
    outputCanvas.height = canvas.width;
    const outputContext = outputCanvas.getContext('2d');
    if (!outputContext) return Promise.reject(new Error('Canvas 2D context unavailable'));
    outputContext.translate(outputCanvas.width / 2, outputCanvas.height / 2);
    outputContext.rotate((outputRotation * Math.PI) / 180);
    outputContext.drawImage(canvas, -canvas.width / 2, -canvas.height / 2);
  }

  return new Promise<Blob>((resolve, reject) => {
    outputCanvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Failed to encode captured frame'));
      },
      'image/jpeg',
      quality,
    );
  });
}
