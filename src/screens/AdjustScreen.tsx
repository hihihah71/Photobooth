import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import type { AppState, FrameConfig, SlotImage } from '../types';
import type { Action } from '../state/appReducer';
import { SlotPreview } from '../components/SlotPreview';
import { identityTransform } from '../utils/coverFit';
import { loadValidatedImage } from '../utils/imageValidation';
import { photoFilters } from '../config/photoFilters';

type Props = {
  state: AppState;
  frame: FrameConfig;
  dispatch: React.Dispatch<Action>;
  allFrames: FrameConfig[];
};

type Pending = { kind: 'replace'; slot: number } | { kind: 'add'; slot: number };

export function AdjustScreen({ state, frame, dispatch, allFrames }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [scale, setScale] = useState(1);
  const [menuFor, setMenuFor] = useState<number | null>(null);
  const [swapSource, setSwapSource] = useState<number | null>(null);
  const [confirmDeleteFor, setConfirmDeleteFor] = useState<number | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const pendingRef = useRef<Pending | null>(null);

  useLayoutEffect(() => {
    function measure() {
      const el = containerRef.current;
      if (!el) return;
      const maxW = el.clientWidth;
      const maxH = el.clientHeight;
      const fit = Math.min(maxW / frame.output.width, maxH / frame.output.height);
      setScale(fit > 0 ? fit : 1);
    }
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [frame]);

  const promptForImage = useCallback((slotIdx: number, kind: Pending['kind']) => {
    pendingRef.current = { kind, slot: slotIdx };
    fileInputRef.current?.click();
  }, []);

  const handleFileSelected = useCallback(
    async (files: FileList | null) => {
      const pending = pendingRef.current;
      pendingRef.current = null;
      const file = files?.[0];
      if (!file || !pending) return;
      setUploadError(null);
      try {
        const img = await loadValidatedImage(file);
        const sourceUrl = URL.createObjectURL(file);
        const slotImage: SlotImage = {
          image: img,
          sourceUrl,
          transform: identityTransform,
        };
        dispatch({ type: 'setSlotImage', index: pending.slot, image: slotImage });
      } catch (err) {
        setUploadError(err instanceof Error ? err.message : 'Failed to load image');
        console.error('Failed to load image', err);
      } finally {
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    },
    [dispatch],
  );

  const handleSlotTap = useCallback(
    (i: number) => {
      // Swap mode: tap a different slot to perform the swap; tap source to cancel.
      if (swapSource !== null) {
        if (swapSource === i) {
          setSwapSource(null);
          return;
        }
        dispatch({ type: 'swapSlots', a: swapSource, b: i });
        setSwapSource(null);
        return;
      }
      const has = !!state.slotImages[i];
      if (!has) {
        promptForImage(i, 'add');
        return;
      }
      setMenuFor((prev) => (prev === i ? null : i));
    },
    [swapSource, state.slotImages, promptForImage, dispatch],
  );

  const closeMenu = useCallback(() => setMenuFor(null), []);

  const onReplace = useCallback(() => {
    if (menuFor === null) return;
    const idx = menuFor;
    closeMenu();
    promptForImage(idx, 'replace');
  }, [menuFor, closeMenu, promptForImage]);

  const onMove = useCallback(() => {
    if (menuFor === null) return;
    setSwapSource(menuFor);
    closeMenu();
  }, [menuFor, closeMenu]);

  const onDelete = useCallback(() => {
    if (menuFor === null) return;
    setConfirmDeleteFor(menuFor);
    closeMenu();
  }, [menuFor, closeMenu]);

  const confirmDelete = useCallback(() => {
    if (confirmDeleteFor === null) return;
    dispatch({ type: 'clearSlotImage', index: confirmDeleteFor });
    setConfirmDeleteFor(null);
  }, [confirmDeleteFor, dispatch]);

  const allSlotsFilled = frame.slots.every((_, index) => Boolean(state.slotImages[index]));

  return (
    <div className="screen adjust-screen">
      <header className="screen-header">
        <button
          type="button"
          className="btn btn-ghost"
          onClick={() => dispatch({ type: 'goto', step: 'capture' })}
        >
          ← Back
        </button>
        <span className="screen-title">Adjust</span>
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => dispatch({ type: 'goto', step: 'preview' })}
          disabled={!allSlotsFilled}
          title={allSlotsFilled ? undefined : 'Fill every photo slot before previewing'}
        >
          Done
        </button>
      </header>

      <p className="muted adjust-hint">
        {swapSource !== null
          ? 'Tap another slot to swap. Tap the highlighted one to cancel.'
          : 'Drag a photo to reposition. Pinch or scroll to zoom. Tap for options.'}
      </p>
      {uploadError && <p className="warning">{uploadError}</p>}

      <section className="filter-picker" aria-labelledby="filter-picker-title">
        <div className="filter-picker-heading">
          <span id="filter-picker-title" className="filter-picker-title">Photo filter</span>
          <span className="muted">Applied to every photo, not the frame</span>
        </div>
        <div className="filter-strip" role="radiogroup" aria-label="Photo filter">
          {photoFilters.map((filter) => {
            const active = state.photoFilter === filter.id;
            const previewImage = state.slotImages.find(Boolean);
            return (
              <button
                key={filter.id}
                type="button"
                role="radio"
                aria-checked={active}
                className={`filter-option ${active ? 'active' : ''}`}
                onClick={() => dispatch({ type: 'setPhotoFilter', filter: filter.id })}
                title={filter.description}
              >
                {previewImage && (
                  <img
                    src={previewImage.sourceUrl}
                    alt=""
                    style={{ filter: filter.css }}
                  />
                )}
                <span>{filter.name}</span>
              </button>
            );
          })}
        </div>
      </section>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => void handleFileSelected(e.target.files)}
      />

      <div ref={containerRef} className="adjust-stage">
        <div
          className="adjust-frame"
          style={{
            width: frame.output.width * scale,
            height: frame.output.height * scale,
            ...(frame.background && 'color' in frame.background
              ? { backgroundColor: frame.background.color }
              : {}),
          }}
        >
          {frame.background && 'image' in frame.background && (
            <img
              src={frame.background.image}
              alt=""
              className="frame-background"
              style={{
                width: frame.output.width * scale,
                height: frame.output.height * scale,
              }}
            />
          )}
          {frame.slots.map((slot, i) => {
            const inSwap = swapSource !== null;
            const swapMode: 'source' | 'target' | null = !inSwap
              ? null
              : swapSource === i
                ? 'source'
                : 'target';
            return (
              <SlotPreview
                key={i}
                slot={slot}
                slotImage={state.slotImages[i]}
                scale={scale}
                photoFilter={state.photoFilter}
                interactive
                outlined={menuFor === i}
                swapMode={swapMode}
                onTap={() => handleSlotTap(i)}
                onTransformChange={(transform) =>
                  dispatch({ type: 'updateSlotTransform', index: i, transform })
                }
                placeholder={
                  swapMode === 'target' ? (
                    <div className="slot-empty-cta" aria-hidden="true">
                      <span className="slot-empty-plus">⇄</span>
                      <span className="slot-empty-label">Swap here</span>
                    </div>
                  ) : (
                    <div className="slot-empty-cta" aria-hidden="true">
                      <span className="slot-empty-plus">+</span>
                      <span className="slot-empty-label">Add photo</span>
                    </div>
                  )
                }
              />
            );
          })}
          {frame.overlay && (
            <img
              src={frame.overlay}
              alt=""
              className="frame-overlay"
              style={{
                width: frame.output.width * scale,
                height: frame.output.height * scale,
              }}
            />
          )}
        </div>
      </div>

      {swapSource !== null ? (
        <div className="swap-mode-bar" role="status">
          <span className="swap-mode-text">
            <span className="swap-mode-pill">⇄ Swap mode</span>
            Tap another slot to swap with photo {swapSource + 1}.
          </span>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => setSwapSource(null)}
          >
            Cancel
          </button>
        </div>
      ) : (
        <div className="frame-swap" aria-label="Try another frame">
          <span className="frame-swap-label">Try another frame</span>
          <ul className="frame-swap-strip">
            {allFrames.map((f) => (
              <li key={f.id}>
                <button
                  type="button"
                  className={`frame-swap-tile ${f.id === frame.id ? 'active' : ''}`}
                  onClick={() => {
                    setMenuFor(null);
                    setSwapSource(null);
                    dispatch({
                      type: 'swapFrame',
                      frameId: f.id,
                      slotCount: f.slots.length,
                    });
                  }}
                  aria-label={f.name}
                  title={f.name}
                >
                  <img src={f.thumbnail} alt="" loading="lazy" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {menuFor !== null && (
        <div className="modal" role="dialog" aria-modal="true">
          <div className="modal-backdrop" onClick={closeMenu} />
          <div className="modal-card confirm-card">
            <h2 className="modal-title">Slot {menuFor + 1}</h2>
            <div className="slot-menu-actions">
              <button type="button" className="btn btn-ghost" onClick={onReplace}>
                Replace photo
              </button>
              <button type="button" className="btn btn-ghost" onClick={onMove}>
                Move to another slot
              </button>
              <button
                type="button"
                className="btn btn-ghost btn-danger"
                onClick={onDelete}
              >
                Delete photo
              </button>
              <button type="button" className="btn btn-ghost" onClick={closeMenu}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmDeleteFor !== null && (
        <div className="modal" role="alertdialog" aria-modal="true">
          <div
            className="modal-backdrop"
            onClick={() => setConfirmDeleteFor(null)}
          />
          <div className="modal-card confirm-card">
            <h2 className="modal-title">Delete photo?</h2>
            <p className="muted">
              The photo in slot {confirmDeleteFor + 1} will be removed. The slot
              becomes empty and tappable to add a new one.
            </p>
            <div className="modal-actions">
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setConfirmDeleteFor(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-danger-solid"
                onClick={confirmDelete}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
