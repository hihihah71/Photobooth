import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

export type CameraStatus = 'idle' | 'requesting' | 'ready' | 'denied' | 'unavailable';

export type CameraState = {
  status: CameraStatus;
  error?: string;
  stream?: MediaStream;
  facing: 'user' | 'environment';
};

export function useCamera(active: boolean): {
  state: CameraState;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  switchFacing: () => void;
} {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [facing, setFacing] = useState<'user' | 'environment'>('user');

  const platformUnavailable = useMemo(
    () => typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia,
    [],
  );

  const [state, setState] = useState<CameraState>(() =>
    platformUnavailable
      ? { status: 'unavailable', facing: 'user', error: 'Camera API not available' }
      : { status: 'idle', facing: 'user' },
  );

  useEffect(() => {
    if (!active || platformUnavailable) return;

    let cancelled = false;
    let acquired: MediaStream | null = null;

    async function acquire() {
      setState((prev) => ({ ...prev, status: 'requesting', facing }));
      try {
        let stream: MediaStream;
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: {
              facingMode: { ideal: facing },
            },
            audio: false,
          });
        } catch {
          stream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false,
          });
        }
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        acquired = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        setState({ status: 'ready', stream, facing });
      } catch (err) {
        if (cancelled) return;
        const name = err instanceof Error ? err.name : '';
        if (name === 'NotAllowedError' || name === 'SecurityError') {
          setState({ status: 'denied', facing, error: 'Camera permission denied' });
        } else if (name === 'NotFoundError' || name === 'OverconstrainedError') {
          setState({ status: 'unavailable', facing, error: 'No camera found' });
        } else {
          setState({
            status: 'unavailable',
            facing,
            error: err instanceof Error ? err.message : 'Camera failed to start',
          });
        }
      }
    }

    const videoEl = videoRef.current;
    void acquire();

    return () => {
      cancelled = true;
      if (acquired) {
        acquired.getTracks().forEach((t) => t.stop());
      }
      if (videoEl) {
        videoEl.srcObject = null;
      }
    };
  }, [active, facing, platformUnavailable]);

  const switchFacing = useCallback(() => {
    setFacing((f) => (f === 'user' ? 'environment' : 'user'));
  }, []);

  return { state, videoRef, switchFacing };
}
