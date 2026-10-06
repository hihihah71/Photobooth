import { useCallback, useEffect, useRef, useState } from 'react';
import type { AppState, FrameConfig, SlotImage } from '../types';
import type { Action } from '../state/appReducer';
import { CameraView } from '../components/CameraView';
import { identityTransform } from '../utils/coverFit';
import { loadValidatedImage } from '../utils/imageValidation';
import { MAX_CAPTURE_PHOTOS, togglePhotoSelection } from '../utils/photoSelection';

type Props = {
  state: AppState;
  frame: FrameConfig;
  dispatch: React.Dispatch<Action>;
};

type Mode = 'camera' | 'upload';
type PhotoCandidate = {
  id: string;
  slotImage: SlotImage;
  /** True when this screen created the object URL and owns its cleanup. */
  owned: boolean;
};

export function CaptureScreen({ state, frame, dispatch }: Props) {
  const totalSlots = frame.slots.length;
  const [mode, setMode] = useState<Mode>('camera');
  const [pending, setPending] = useState<SlotImage | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [candidates, setCandidates] = useState<PhotoCandidate[]>(() =>
    state.slotImages.slice(0, totalSlots).flatMap((slotImage, index) =>
      slotImage
        ? [{ id: `existing-${index}-${slotImage.sourceUrl}`, slotImage, owned: false }]
        : [],
    ),
  );
  const [selectedIds, setSelectedIds] = useState<string[]>(() =>
    candidates.slice(0, totalSlots).map((candidate) => candidate.id),
  );

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const pendingUrlRef = useRef<string | null>(null);
  const candidatesRef = useRef(candidates);
  const transferredUrlsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    candidatesRef.current = candidates;
  }, [candidates]);

  useEffect(
    () => () => {
      if (pendingUrlRef.current) URL.revokeObjectURL(pendingUrlRef.current);
      for (const candidate of candidatesRef.current) {
        const url = candidate.slotImage.sourceUrl;
        if (candidate.owned && !transferredUrlsRef.current.has(url)) {
          URL.revokeObjectURL(url);
        }
      }
    },
    [],
  );

  const appendCandidates = useCallback(
    (incoming: PhotoCandidate[]) => {
      const room = Math.max(0, MAX_CAPTURE_PHOTOS - candidates.length);
      const accepted = incoming.slice(0, room);
      for (const rejected of incoming.slice(room)) {
        if (rejected.owned) URL.revokeObjectURL(rejected.slotImage.sourceUrl);
      }
      if (accepted.length === 0) return;

      setCandidates((current) => [...current, ...accepted]);
      setSelectedIds((current) => {
        const next = current.slice();
        for (const candidate of accepted) {
          if (next.length >= totalSlots) break;
          next.push(candidate.id);
        }
        return next;
      });
    },
    [candidates.length, totalSlots],
  );

  const setPendingFromBlob = useCallback(async (blob: Blob) => {
    if (candidates.length >= MAX_CAPTURE_PHOTOS) {
      setError(`You can keep at most ${MAX_CAPTURE_PHOTOS} photos. Remove one to take another.`);
      return;
    }
    setError(null);
    const url = URL.createObjectURL(blob);
    try {
      const image = await loadValidatedImage(blob);
      if (pendingUrlRef.current) URL.revokeObjectURL(pendingUrlRef.current);
      pendingUrlRef.current = url;
      setPending({ image, sourceUrl: url, transform: identityTransform });
    } catch (err) {
      URL.revokeObjectURL(url);
      setError(err instanceof Error ? err.message : 'Failed to load image');
      console.error('Failed to load image', err);
    }
  }, [candidates.length]);

  const handleCapture = useCallback(
    (blob: Blob) => {
      void setPendingFromBlob(blob);
    },
    [setPendingFromBlob],
  );

  const handleUpload = useCallback(
    async (files: FileList | null) => {
      if (!files || files.length === 0) return;
      const room = MAX_CAPTURE_PHOTOS - candidates.length;
      if (room <= 0) {
        setError(`You can keep at most ${MAX_CAPTURE_PHOTOS} photos. Remove one first.`);
        return;
      }

      const list = Array.from(files).slice(0, room);
      setError(files.length > room ? `Only the first ${room} photo(s) were added.` : null);

      try {
        if (list.length === 1) {
          await setPendingFromBlob(list[0]);
          return;
        }

        const loaded: PhotoCandidate[] = [];
        for (const file of list) {
          try {
            const image = await loadValidatedImage(file);
            loaded.push(createCandidate({
              image,
              sourceUrl: URL.createObjectURL(file),
              transform: identityTransform,
            }));
          } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load an uploaded image');
            console.error('Failed to load uploaded image', err);
          }
        }
        appendCandidates(loaded);
      } finally {
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    },
    [appendCandidates, candidates.length, setPendingFromBlob],
  );

  const confirmPending = useCallback(() => {
    if (!pending) return;
    appendCandidates([createCandidate(pending)]);
    pendingUrlRef.current = null;
    setPending(null);
  }, [appendCandidates, pending]);

  const retake = useCallback(() => {
    if (pendingUrlRef.current) URL.revokeObjectURL(pendingUrlRef.current);
    pendingUrlRef.current = null;
    setPending(null);
  }, []);

  const rotatePending = useCallback(async () => {
    if (!pending) return;
    try {
      const rotated = await rotateImageClockwise(pending.image);
      await setPendingFromBlob(rotated);
    } catch (err) {
      console.error('Failed to rotate photo', err);
      setError(err instanceof Error ? err.message : 'Failed to rotate photo.');
    }
  }, [pending, setPendingFromBlob]);

  const toggleCandidate = useCallback(
    (id: string) => {
      setError(null);
      setSelectedIds((current) => togglePhotoSelection(current, id, totalSlots));
    },
    [totalSlots],
  );

  const removeCandidate = useCallback((id: string) => {
    const candidate = candidates.find((item) => item.id === id);
    if (!candidate) return;
    if (candidate.owned) URL.revokeObjectURL(candidate.slotImage.sourceUrl);
    setCandidates((current) => current.filter((item) => item.id !== id));
    setSelectedIds((current) => current.filter((selectedId) => selectedId !== id));
    setError(null);
  }, [candidates]);

  const confirmSelection = useCallback(() => {
    if (selectedIds.length !== totalSlots) {
      setError(`Select exactly ${totalSlots} photo${totalSlots === 1 ? '' : 's'} for this frame.`);
      return;
    }

    const selected = selectedIds
      .map((id) => candidates.find((candidate) => candidate.id === id))
      .filter((candidate): candidate is PhotoCandidate => Boolean(candidate));
    if (selected.length !== totalSlots) {
      setError('One of the selected photos is no longer available. Select again.');
      return;
    }

    selected.forEach((candidate, index) => {
      if (candidate.owned) transferredUrlsRef.current.add(candidate.slotImage.sourceUrl);
      dispatch({ type: 'setSlotImage', index, image: candidate.slotImage });
    });
    dispatch({ type: 'setActiveSlot', index: 0 });
    dispatch({ type: 'goto', step: 'adjust' });
  }, [candidates, dispatch, selectedIds, totalSlots]);

  if (totalSlots > MAX_CAPTURE_PHOTOS) {
    return (
      <div className="screen capture-screen">
        <header className="screen-header">
          <button type="button" className="btn btn-ghost" onClick={() => dispatch({ type: 'reset' })}>
            ← Back
          </button>
          <span className="screen-title">Capture</span>
          <span />
        </header>
        <div className="camera-message">
          <p className="warning">This frame has {totalSlots} slots, but a capture session supports at most {MAX_CAPTURE_PHOTOS}.</p>
          <p className="muted">Choose another frame or edit this custom frame.</p>
        </div>
      </div>
    );
  }

  const atLimit = candidates.length >= MAX_CAPTURE_PHOTOS;
  const ready = candidates.length >= totalSlots && selectedIds.length === totalSlots;
  const remainingMinimum = Math.max(0, totalSlots - candidates.length);
  const captureSlotIndex = candidates.length % totalSlots;
  const captureSlot = frame.slots[captureSlotIndex];
  const captureAspect = captureSlot.width / captureSlot.height;

  return (
    <div className="screen capture-screen">
      <header className="screen-header">
        <button type="button" className="btn btn-ghost" onClick={() => dispatch({ type: 'reset' })}>
          ← Back
        </button>
        <div className="capture-counter" aria-live="polite">
          <strong>{candidates.length}/{MAX_CAPTURE_PHOTOS}</strong>
          <span>{frame.name} · need {totalSlots}</span>
        </div>
        <span />
      </header>

      {pending ? (
        <div className="capture-preview">
          <img src={pending.sourceUrl} alt="New photo preview" className="capture-preview-image" />
          <div className="capture-actions">
            <button type="button" className="btn btn-ghost" onClick={retake}>Retake</button>
            <button type="button" className="btn btn-ghost" onClick={() => void rotatePending()}>
              Rotate 90°
            </button>
            <button type="button" className="btn btn-primary" onClick={confirmPending}>Keep photo</button>
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

          {atLimit ? (
            <div className="capture-limit-card">
              <strong>6-photo limit reached</strong>
              <span className="muted">Select the best photos below, or remove one to take another.</span>
            </div>
          ) : mode === 'camera' ? (
            <CameraView
              onCapture={handleCapture}
              countdownSeconds={3}
              targetAspect={captureAspect}
            />
          ) : (
            <div className="upload-area">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                hidden
                onChange={(event) => void handleUpload(event.target.files)}
              />
              <button
                type="button"
                className="btn btn-primary upload-button"
                onClick={() => fileInputRef.current?.click()}
              >
                Choose photo(s)
              </button>
              <p className="muted">You can add {MAX_CAPTURE_PHOTOS - candidates.length} more.</p>
            </div>
          )}
        </>
      )}

      {error && <p className="warning capture-error">{error}</p>}

      {candidates.length > 0 && (
        <section className="candidate-picker" aria-labelledby="candidate-picker-title">
          <div className="candidate-picker-header">
            <div>
              <h2 id="candidate-picker-title">Choose photos for the frame</h2>
              <p className="muted">
                {remainingMinimum > 0
                  ? `Take at least ${remainingMinimum} more.`
                  : `Select ${totalSlots}. Selection order becomes slot order.`}
              </p>
            </div>
            <span className="candidate-selection-count">{selectedIds.length}/{totalSlots} selected</span>
          </div>

          <ul className="candidate-grid">
            {candidates.map((candidate) => {
              const selectionIndex = selectedIds.indexOf(candidate.id);
              const selected = selectionIndex >= 0;
              return (
                <li key={candidate.id} className="candidate-card">
                  <button
                    type="button"
                    className={`candidate-tile ${selected ? 'selected' : ''}`}
                    onClick={() => toggleCandidate(candidate.id)}
                    aria-pressed={selected}
                    aria-label={selected
                      ? `Photo selected for slot ${selectionIndex + 1}`
                      : 'Select this photo'}
                  >
                    <img src={candidate.slotImage.sourceUrl} alt="" />
                    {selected && <span className="candidate-order">{selectionIndex + 1}</span>}
                  </button>
                  <button
                    type="button"
                    className="candidate-delete"
                    onClick={() => removeCandidate(candidate.id)}
                    aria-label="Remove this photo"
                    title="Remove photo"
                  >
                    ×
                  </button>
                </li>
              );
            })}
          </ul>

          <button
            type="button"
            className="btn btn-primary candidate-confirm"
            onClick={confirmSelection}
            disabled={!ready}
          >
            Use selected photos
          </button>
        </section>
      )}
    </div>
  );
}

function createCandidate(slotImage: SlotImage): PhotoCandidate {
  const id = typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `candidate-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
  return { id, slotImage, owned: true };
}

function rotateImageClockwise(image: HTMLImageElement): Promise<Blob> {
  const canvas = document.createElement('canvas');
  canvas.width = image.naturalHeight;
  canvas.height = image.naturalWidth;
  const context = canvas.getContext('2d');
  if (!context) return Promise.reject(new Error('Canvas 2D context unavailable.'));

  context.translate(canvas.width / 2, canvas.height / 2);
  context.rotate(Math.PI / 2);
  context.drawImage(
    image,
    -image.naturalWidth / 2,
    -image.naturalHeight / 2,
    image.naturalWidth,
    image.naturalHeight,
  );

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => blob ? resolve(blob) : reject(new Error('Failed to encode rotated photo.')),
      'image/jpeg',
      0.92,
    );
  });
}
