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
  const [viewRotation, setViewRotation] = useState<0 | 90 | 180 | 270>(0);

  const mirror = state.facing === 'user';
  const stageAspect = targetAspect && targetAspect > 0
    ? targetAspect
    : 4 / 3;
  const viewIsQuarterTurn = viewRotation === 90 || viewRotation === 270;
  const viewAspect = viewIsQuarterTurn ? 1 / stageAspect : stageAspect;
  const rotatedVideoStyle = getRotatedVideoStyle(stageAspect, viewRotation, mirror);

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
        <div className="camera-stage" style={{ aspectRatio: viewAspect }}>
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="camera-video"
            style={rotatedVideoStyle}
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
        <button
          type="button"
          className="btn btn-ghost camera-view-rotate-button"
          onClick={() => setViewRotation(nextViewRotation(viewRotation))}
          disabled={counting}
          aria-label="Rotate camera view 90 degrees"
        >
          <span aria-hidden="true">↻</span>
          <span>Rotate view</span>
        </button>
      </div>
    </div>
  );
}

function nextViewRotation(current: 0 | 90 | 180 | 270): 0 | 90 | 180 | 270 {
  if (current === 0) return 90;
  if (current === 90) return 180;
  if (current === 180) return 270;
  return 0;
}

function getRotatedVideoStyle(
  aspect: number,
  rotation: 0 | 90 | 180 | 270,
  mirror: boolean,
): React.CSSProperties {
  const quarterTurn = rotation === 90 || rotation === 270;
  const mirrorTransform = !mirror
    ? ''
    : quarterTurn
      ? ' scaleY(-1)'
      : ' scaleX(-1)';

  return {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: quarterTurn ? `${aspect * 100}%` : '100%',
    height: quarterTurn ? `${(100 / aspect)}%` : '100%',
    transform: `translate(-50%, -50%) rotate(${rotation}deg)${mirrorTransform}`,
  };
}
