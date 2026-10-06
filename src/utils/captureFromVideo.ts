export function captureFromVideo(
  video: HTMLVideoElement,
  options: {
    mirror?: boolean;
    quality?: number;
    targetAspect?: number;
    orientationAngle?: number;
  } = {},
): Promise<Blob> {
  const {
    mirror = false,
    quality = 0.92,
    targetAspect,
    orientationAngle = getScreenOrientationAngle(),
  } = options;
  const srcW = video.videoWidth;
  const srcH = video.videoHeight;
  if (!srcW || !srcH) {
    return Promise.reject(new Error('Video has no dimensions yet'));
  }

  const rotation = getCaptureRotation(srcW, srcH, targetAspect, orientationAngle);
  let source: CanvasImageSource = video;
  let orientedW = srcW;
  let orientedH = srcH;

  if (rotation !== 0) {
    const orientedCanvas = document.createElement('canvas');
    orientedCanvas.width = srcH;
    orientedCanvas.height = srcW;
    const orientedContext = orientedCanvas.getContext('2d');
    if (!orientedContext) {
      return Promise.reject(new Error('Canvas 2D context unavailable'));
    }
    orientedContext.translate(orientedCanvas.width / 2, orientedCanvas.height / 2);
    orientedContext.rotate((rotation * Math.PI) / 180);
    orientedContext.drawImage(video, -srcW / 2, -srcH / 2, srcW, srcH);
    source = orientedCanvas;
    orientedW = orientedCanvas.width;
    orientedH = orientedCanvas.height;
  }

  // If a target aspect is provided, center-crop the orientation-normalized frame.
  // This lets capture pre-align with the slot so cover-fit becomes a no-op.
  let cropW = orientedW;
  let cropH = orientedH;
  let cropX = 0;
  let cropY = 0;
  if (targetAspect && targetAspect > 0) {
    const srcAspect = orientedW / orientedH;
    if (srcAspect > targetAspect) {
      cropW = orientedH * targetAspect;
      cropX = (orientedW - cropW) / 2;
    } else {
      cropH = orientedW / targetAspect;
      cropY = (orientedH - cropH) / 2;
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
  ctx.drawImage(source, cropX, cropY, cropW, cropH, 0, 0, canvas.width, canvas.height);

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

/**
 * Some mobile browsers keep the MediaStream's old pixel orientation after
 * the viewport rotates. Rotate only when source and requested orientations
 * disagree, avoiding double-rotation on browsers that already normalize it.
 */
export function getCaptureRotation(
  sourceWidth: number,
  sourceHeight: number,
  targetAspect?: number,
  orientationAngle = 0,
): 0 | 90 | -90 {
  if (!targetAspect || targetAspect <= 0) return 0;
  const sourceLandscape = sourceWidth >= sourceHeight;
  const targetLandscape = targetAspect >= 1;
  if (sourceLandscape === targetLandscape) return 0;

  const normalizedAngle = ((orientationAngle % 360) + 360) % 360;
  return normalizedAngle === 270 || normalizedAngle === 180 ? -90 : 90;
}

function getScreenOrientationAngle(): number {
  if (typeof screen !== 'undefined' && screen.orientation) {
    return screen.orientation.angle;
  }
  if (typeof window !== 'undefined') {
    return (window as Window & { orientation?: number }).orientation ?? 0;
  }
  return 0;
}
