import { useCallback, useEffect, useRef, useState } from 'react';
import type { AppState, FrameConfig, SlotImage } from '../types';
import type { Action } from '../state/appReducer';
import { CameraView } from '../components/CameraView';
import { StepIndicator } from '../components/StepIndicator';
import { identityTransform } from '../utils/coverFit';
import { loadValidatedImage } from '../utils/imageValidation';

type Props = {
  state: AppState;
  frame: FrameConfig;
  dispatch: React.Dispatch<Action>;
};

type Mode = 'camera' | 'upload';
type PendingPhoto = { blob: Blob; image: HTMLImageElement; sourceUrl: string } | null;

export function CaptureScreen({ state, frame, dispatch }: Props) {
  const [mode, setMode] = useState<Mode>('camera');
  const [pending, setPending] = useState<PendingPhoto>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const pendingUrlRef = useRef<string | null>(null);

  const totalSlots = frame.slots.length;
  const activeSlot = state.activeSlot;
  const filledCount = state.slotImages.slice(0, totalSlots).filter(Boolean).length;

  useEffect(() => {
    return () => {
      if (pendingUrlRef.current) {
        URL.revokeObjectURL(pendingUrlRef.current);
        pendingUrlRef.current = null;
      }
    };
  }, []);

  const setPendingFromBlob = useCallback(async (blob: Blob) => {
    setError(null);
    const url = URL.createObjectURL(blob);
    try {
      const img = await loadValidatedImage(blob);
      if (pendingUrlRef.current) URL.revokeObjectURL(pendingUrlRef.current);
      pendingUrlRef.current = url;
      setPending({ blob, image: img, sourceUrl: url });
    } catch (err) {
      URL.revokeObjectURL(url);
      setError(err instanceof Error ? err.message : 'Failed to load image');
      console.error('Failed to load image', err);
    }
  }, []);

  const handleCapture = useCallback(
    (blob: Blob) => {
      void setPendingFromBlob(blob);
    },
    [setPendingFromBlob],
  );

  const handleUpload = useCallback(
    async (files: FileList | null) => {
      if (!files || files.length === 0) return;
      const list = Array.from(files);
      setError(null);

      try {
        if (list.length === 1) {
          await setPendingFromBlob(list[0]);
          return;
        }

        const projected = Array.from(
          { length: totalSlots },
          (_, index) => state.slotImages[index] ?? null,
        );
        const emptyIndices: number[] = [];
        for (let offset = 0; offset < totalSlots; offset += 1) {
          const index = (activeSlot + offset) % totalSlots;
          if (!projected[index]) emptyIndices.push(index);
        }
        // If the user returned from Adjust with a full frame, treat a bulk
        // selection as a replacement of the active slot instead of silently
        // overwriting every following slot.
        const targetIndices = emptyIndices.length > 0
          ? emptyIndices
          : [Math.min(activeSlot, totalSlots - 1)];
        let changed = false;
        let lastTarget = targetIndices[0];

        for (let i = 0; i < list.length && i < targetIndices.length; i += 1) {
          const file = list[i];
          const target = targetIndices[i];
          try {
            const img = await loadValidatedImage(file);
            const url = URL.createObjectURL(file);
            const slotImage: SlotImage = {
              image: img,
              sourceUrl: url,
              transform: identityTransform,
            };
            projected[target] = slotImage;
            dispatch({ type: 'setSlotImage', index: target, image: slotImage });
            changed = true;
            lastTarget = target;
          } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load an uploaded image');
            console.error('Failed to load uploaded image', err);
          }
        }

        if (!changed) return;
        const nextEmpty = projected.findIndex((slotImage) => slotImage === null);
        dispatch({ type: 'setActiveSlot', index: nextEmpty >= 0 ? nextEmpty : lastTarget });
        if (nextEmpty === -1) dispatch({ type: 'goto', step: 'adjust' });
      } finally {
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    },
    [activeSlot, totalSlots, dispatch, setPendingFromBlob, state.slotImages],
  );

  const confirmPending = useCallback(() => {
    if (!pending) return;
    const slotImage: SlotImage = {
      image: pending.image,
      sourceUrl: pending.sourceUrl,
      transform: identityTransform,
    };
    dispatch({ type: 'setSlotImage', index: activeSlot, image: slotImage });
    pendingUrlRef.current = null;
    setPending(null);

    // Compute the next-empty index from a hypothetical post-dispatch state
    // (the reducer hasn't applied yet, so state.slotImages is still stale).
    const projected = state.slotImages.slice();
    projected[activeSlot] = slotImage;
    const nextEmpty = projected.slice(0, totalSlots).findIndex((s) => s === null);
    if (nextEmpty === -1) {
      dispatch({ type: 'goto', step: 'adjust' });
    } else {
      dispatch({ type: 'setActiveSlot', index: nextEmpty });
    }
  }, [pending, activeSlot, dispatch, state.slotImages, totalSlots]);

  const retake = useCallback(() => {
    if (pendingUrlRef.current) {
      URL.revokeObjectURL(pendingUrlRef.current);
      pendingUrlRef.current = null;
    }
    setPending(null);
  }, []);

  return (
    <div className="screen capture-screen">
      <header className="screen-header">
        <button
          type="button"
          className="btn btn-ghost"
          onClick={() => dispatch({ type: 'reset' })}
        >
          ← Back
        </button>
        <StepIndicator
          current={filledCount + 1}
          total={totalSlots}
          label={`${frame.name} · slot ${activeSlot + 1}`}
        />
        <span />
      </header>

      {pending ? (
        <div className="capture-preview">
          <img src={pending.sourceUrl} alt="Preview" className="capture-preview-image" />
          <div className="capture-actions">
            <button type="button" className="btn btn-ghost" onClick={retake}>
              Retake
            </button>
            <button type="button" className="btn btn-primary" onClick={confirmPending}>
              Use this photo
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="mode-tabs" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'camera'}
              className={`mode-tab ${mode === 'camera' ? 'active' : ''}`}
              onClick={() => setMode('camera')}
            >
              Camera
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'upload'}
              className={`mode-tab ${mode === 'upload' ? 'active' : ''}`}
              onClick={() => setMode('upload')}
            >
              Upload
            </button>
          </div>

          {mode === 'camera' ? (
            <CameraView
              onCapture={handleCapture}
              targetAspect={
                frame.slots[activeSlot]
                  ? frame.slots[activeSlot].width / frame.slots[activeSlot].height
                  : undefined
              }
            />
          ) : (
            <div className="upload-area">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                hidden
                onChange={(e) => void handleUpload(e.target.files)}
              />
              <button
                type="button"
                className="btn btn-primary upload-button"
                onClick={() => fileInputRef.current?.click()}
              >
                Choose photo(s)
              </button>
              <p className="muted">
                Pick {totalSlots - filledCount} more {totalSlots - filledCount === 1 ? 'photo' : 'photos'} to fill the frame.
              </p>
            </div>
          )}
        </>
      )}
      {error && <p className="warning">{error}</p>}
    </div>
  );
}

