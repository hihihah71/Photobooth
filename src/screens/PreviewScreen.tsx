import { useCallback, useRef, useState } from 'react';
import type { AppState, FrameConfig } from '../types';
import type { Action } from '../state/appReducer';
import { CompositeCanvas } from '../components/CompositeCanvas';
import type { CompositeCanvasHandle } from '../components/CompositeCanvas';
import { CloudShareButton } from '../components/CloudShareButton';
import { downloadBlob } from '../utils/download';

type Props = {
  state: AppState;
  frame: FrameConfig;
  dispatch: React.Dispatch<Action>;
};

export function PreviewScreen({ state, frame, dispatch }: Props) {
  const canvasRef = useRef<CompositeCanvasHandle>(null);
  const [filename] = useState(() => `photobooth-${frame.id}-${Date.now()}.png`);
  const revealClass = frame.revealAnimation ?? 'fade-in';

  const getCompositeBlob = useCallback(async () => {
    const handle = canvasRef.current;
    if (!handle) throw new Error('Photo is not ready yet.');
    return handle.toBlob();
  }, []);

  const handleDownload = useCallback(async () => {
    downloadBlob(await getCompositeBlob(), filename);
  }, [filename, getCompositeBlob]);

  return (
    <div className="screen preview-screen">
      <header className="screen-header">
        <button
          type="button"
          className="btn btn-ghost"
          onClick={() => dispatch({ type: 'goto', step: 'adjust' })}
        >
          ← Back
        </button>
        <span className="screen-title">Preview</span>
        <span />
      </header>

      <div className="preview-stage">
        <div className={`preview-canvas-wrap ${revealClass} ${frame.className ?? ''}`}>
          <CompositeCanvas
            ref={canvasRef}
            frame={frame}
            slotImages={state.slotImages}
            photoFilter={state.photoFilter}
            className="preview-canvas"
          />
        </div>
      </div>

      <div className="preview-actions">
        <button type="button" className="btn btn-primary" onClick={handleDownload}>
          Download
        </button>
        <CloudShareButton getBlob={getCompositeBlob} filename={filename} />
        <button
          type="button"
          className="btn btn-ghost"
          onClick={() => dispatch({ type: 'reset' })}
        >
          Start Over
        </button>
      </div>
    </div>
  );
}
