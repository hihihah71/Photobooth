import { useCallback, useEffect, useRef, useState } from 'react';
import type { AppState, FrameConfig, SavedPhoto } from '../types';
import type { Action } from '../state/appReducer';
import { CompositeCanvas } from '../components/CompositeCanvas';
import type { CompositeCanvasHandle } from '../components/CompositeCanvas';
import { downloadBlob } from '../utils/download';
import { makeThumbnail } from '../utils/thumbnail';
import { savePhoto } from '../utils/storage';
import { CloudShareButton } from '../components/CloudShareButton';

type Props = {
  state: AppState;
  frame: FrameConfig;
  dispatch: React.Dispatch<Action>;
};

type SaveState = 'pending' | 'saved' | 'failed';

export function PreviewScreen({ state, frame, dispatch }: Props) {
  const canvasRef = useRef<CompositeCanvasHandle>(null);
  const [saveState, setSaveState] = useState<SaveState>('pending');
  const [saveError, setSaveError] = useState<string | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);
  const savedOnceRef = useRef(false);

  const filenameRef = useRef(`photobooth-${frame.id}-${Date.now()}.png`);
  const filename = filenameRef.current;
  const revealClass = frame.revealAnimation ?? 'fade-in';

  useEffect(() => {
    if (savedOnceRef.current) return;
    savedOnceRef.current = true;
    // Give the canvas a tick to render so toBlob is accurate.
    const id = window.setTimeout(async () => {
      try {
        const handle = canvasRef.current;
        if (!handle) throw new Error('Canvas not ready');
        const blob = await handle.toBlob();
        const thumbnail = await makeThumbnail(blob);
        const id = typeof crypto !== 'undefined' && 'randomUUID' in crypto
          ? crypto.randomUUID()
          : `photo-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
        const photo: SavedPhoto = {
          id,
          createdAt: Date.now(),
          frameId: frame.id,
          frameName: frame.name,
          blob,
          thumbnail,
        };
        await savePhoto(photo);
        setSavedId(id);
        setSaveState('saved');
      } catch (err) {
        console.error('Failed to save photo', err);
        setSaveError(err instanceof Error ? err.message : 'Unknown storage error');
        setSaveState('failed');
      }
    }, 300);
    return () => window.clearTimeout(id);
  }, [frame.id, frame.name]);

  const handleDownload = useCallback(async () => {
    const handle = canvasRef.current;
    if (!handle) return;
    const blob = await handle.toBlob();
    downloadBlob(blob, filename);
  }, [filename]);

  const getCompositeBlob = useCallback(async () => {
    const handle = canvasRef.current;
    if (!handle) throw new Error('Photo is not ready yet.');
    return handle.toBlob();
  }, []);

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
            className="preview-canvas"
          />
        </div>
      </div>

      <div className="save-status" aria-live="polite">
        {saveState === 'pending' && <span className="muted">Saving to gallery…</span>}
        {saveState === 'saved' && savedId && (
          <span className="success">✓ Saved to gallery</span>
        )}
        {saveState === 'failed' && (
          <span className="warning">
            Couldn't save to gallery{saveError ? `: ${saveError}` : ''}. Download still works.
          </span>
        )}
      </div>

      <div className="preview-actions">
        <button type="button" className="btn btn-primary" onClick={handleDownload}>
          Download
        </button>
        <CloudShareButton getBlob={getCompositeBlob} filename={filename} />
        <button
          type="button"
          className="btn btn-ghost"
          onClick={() => dispatch({ type: 'goto', step: 'gallery' })}
        >
          View Gallery
        </button>
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
