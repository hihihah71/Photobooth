import { useCallback, useState } from 'react';
import { useCamera } from '../hooks/useCamera';
import { captureFromVideo } from '../utils/captureFromVideo';
import { Countdown } from './Countdown';
import { FlashOverlay } from './FlashOverlay';

type Props = {
  onCapture: (blob: Blob) => void;
  countdownSeconds?: number;
  /** Aspect ratio (width / height) to center-crop the capture to. */
  targetAspect?: number;
};

type CaptureOrientation = 'portrait' | 'landscape';

export function CameraView({ onCapture, countdownSeconds = 3, targetAspect }: Props) {
  const { state, videoRef, switchFacing } = useCamera(true);
  const [counting, setCounting] = useState(false);
  const [flashing, setFlashing] = useState(false);
  const [captureOrientation, setCaptureOrientation] =
    useState<CaptureOrientation>('portrait');

  const mirror = state.facing === 'user';
  const stageAspect = targetAspect && targetAspect > 0
    ? targetAspect
    : captureOrientation === 'landscape'
      ? 4 / 3
      : 3 / 4;

  const handleShutter = useCallback(() => {
    if (state.status !== 'ready' || counting) return;
    setCounting(true);
  }, [state.status, counting]);

  const handleCountdownDone = useCallback(async () => {
    setCounting(false);
    const video = videoRef.current;
    if (!video) return;
    setFlashing(true);
    try {
      const blob = await captureFromVideo(video, { mirror, targetAspect: stageAspect });
      onCapture(blob);
    } catch (err) {
      console.error('Capture failed', err);
    }
  }, [videoRef, mirror, onCapture, stageAspect]);

  if (state.status === 'denied') {
    return (
      <div className="camera-message">
        <p>Camera access was blocked.</p>
        <p className="muted">Use the Upload tab instead, or grant camera permission in your browser settings.</p>
      </div>
    );
  }

  if (state.status === 'unavailable') {
    return (
      <div className="camera-message">
        <p>No camera available on this device.</p>
        <p className="muted">Switch to the Upload tab to use a photo from your device.</p>
      </div>
    );
  }

  return (
    <div className="camera-view">
      <div className="camera-main">
        {!targetAspect && (
          <div className="camera-orientation-picker" role="radiogroup" aria-label="Photo orientation">
            <button
              type="button"
              role="radio"
              aria-checked={captureOrientation === 'portrait'}
              className={`camera-orientation-option ${captureOrientation === 'portrait' ? 'active' : ''}`}
              onClick={() => setCaptureOrientation('portrait')}
              disabled={counting}
            >
              ▯ Portrait
            </button>
            <button
              type="button"
              role="radio"
              aria-checked={captureOrientation === 'landscape'}
              className={`camera-orientation-option ${captureOrientation === 'landscape' ? 'active' : ''}`}
              onClick={() => setCaptureOrientation('landscape')}
              disabled={counting}
            >
              ▭ Landscape
            </button>
          </div>
        )}
        <div className="camera-stage" style={{ aspectRatio: stageAspect }}>
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="camera-video"
            style={{ transform: mirror ? 'scaleX(-1)' : undefined }}
          />
          {flashing && (
            <FlashOverlay duration={250} onDone={() => setFlashing(false)} />
          )}
          {state.status === 'requesting' && (
            <div className="camera-message overlay">
              <p>Starting camera…</p>
            </div>
          )}
        </div>
      </div>
      {counting && (
        <Countdown
          seconds={countdownSeconds}
          onComplete={handleCountdownDone}
          className="countdown-fullscreen"
        />
      )}
      <p className="camera-rotate-hint" aria-hidden="true">
        Choose Portrait or Landscape before taking the photo
      </p>
      <div className="camera-controls">
        <button
          type="button"
          className="btn btn-ghost camera-switch-button"
          onClick={switchFacing}
          aria-label={`Switch to ${mirror ? 'rear' : 'front'} camera`}
          disabled={state.status !== 'ready' || counting}
        >
          <span aria-hidden="true">↻</span>
          <span>{mirror ? 'Rear' : 'Front'}</span>
        </button>
        <button
          type="button"
          className="shutter-button"
          onClick={handleShutter}
          disabled={state.status !== 'ready' || counting}
          aria-label="Take photo"
        >
          <span className="shutter-button-inner" />
        </button>
        <span className="shutter-spacer" aria-hidden="true" />
      </div>
    </div>
  );
}
