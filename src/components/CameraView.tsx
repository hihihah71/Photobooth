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

export function CameraView({ onCapture, countdownSeconds = 3, targetAspect }: Props) {
  const { state, videoRef, switchFacing } = useCamera(true);
  const [counting, setCounting] = useState(false);
  const [flashing, setFlashing] = useState(false);
  const [frameRotation, setFrameRotation] = useState<-90 | 0 | 90>(0);

  const mirror = state.facing === 'user';
  const stageAspect = targetAspect && targetAspect > 0
    ? targetAspect
    : 4 / 3;
  const canRotateFrame = Math.abs(stageAspect - 1) > 0.01;
  const effectiveFrameRotation = canRotateFrame ? frameRotation : 0;
  const frameRotated = effectiveFrameRotation !== 0;
  const viewAspect = frameRotated ? 1 / stageAspect : stageAspect;

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
      const blob = await captureFromVideo(video, {
        mirror,
        targetAspect: viewAspect,
        outputRotation: effectiveFrameRotation === 90 ? -90 : effectiveFrameRotation === -90 ? 90 : 0,
      });
      onCapture(blob);
    } catch (err) {
      console.error('Capture failed', err);
    }
  }, [videoRef, mirror, onCapture, viewAspect, effectiveFrameRotation]);

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
    <div className={`camera-view ${effectiveFrameRotation === -90 ? 'camera-controls-left' : 'camera-controls-right'}`}>
      <div className="camera-main">
        {canRotateFrame && (
          <div className="camera-frame-direction" role="radiogroup" aria-label="Rotate frame for hand position">
            <button
              type="button"
              role="radio"
              aria-checked={frameRotation === -90}
              className={`camera-frame-direction-option ${frameRotation === -90 ? 'active' : ''}`}
              onClick={() => setFrameRotation((current) => current === -90 ? 0 : -90)}
              disabled={counting}
            >
              &#8634; Left hand
            </button>
            <button
              type="button"
              role="radio"
              aria-checked={frameRotation === 90}
              className={`camera-frame-direction-option ${frameRotation === 90 ? 'active' : ''}`}
              onClick={() => setFrameRotation((current) => current === 90 ? 0 : 90)}
              disabled={counting}
            >
              Right hand &#8635;
            </button>
          </div>
        )}
        <div className="camera-stage" style={{ aspectRatio: viewAspect }}>
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
