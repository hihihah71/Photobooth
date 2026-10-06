import {
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import type { Action } from '../state/appReducer';
import type { CustomFrame, SlotConfig } from '../types';
import { makeThumbnail } from '../utils/thumbnail';
import { useObjectUrl } from '../hooks/useObjectUrl';
import {
  loadValidatedImage,
  MAX_CUSTOM_FRAME_PIXELS,
} from '../utils/imageValidation';

type Props = {
  dispatch: React.Dispatch<Action>;
  onSave: (frame: CustomFrame) => Promise<void>;
};

type Handle = 'move' | 'nw' | 'ne' | 'sw' | 'se' | 'n' | 's' | 'e' | 'w';

type DragState = {
  pointerId: number;
  handle: Handle;
  startScreen: { x: number; y: number };
  startSlot: SlotConfig;
  scale: number;
};

const HANDLES_CORNER: Handle[] = ['nw', 'ne', 'sw', 'se'];
const HANDLES_EDGE: Handle[] = ['n', 's', 'e', 'w'];
const MAX_CUSTOM_FRAME_SLOTS = 6;

export function AddFrameScreen({ dispatch, onSave }: Props) {
  const [stage, setStage] = useState<'upload' | 'edit'>('upload');
  const [imageBlob, setImageBlob] = useState<Blob | null>(null);
  const [imageDims, setImageDims] = useState<{ width: number; height: number } | null>(null);
  const [name, setName] = useState('');
  const [slots, setSlots] = useState<SlotConfig[]>([]);
  const [selected, setSelected] = useState(0);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFile = useCallback(async (file: File | null) => {
    if (!file) return;
    setError(null);
    try {
      const img = await loadValidatedImage(file, { maxPixels: MAX_CUSTOM_FRAME_PIXELS });
      setImageBlob(file);
      setImageDims({ width: img.naturalWidth, height: img.naturalHeight });
      // Default: one slot covering 80% of the image, centered.
      const w = Math.round(img.naturalWidth * 0.8);
      const h = Math.round(img.naturalHeight * 0.8);
      setSlots([
        {
          x: Math.round((img.naturalWidth - w) / 2),
          y: Math.round((img.naturalHeight - h) / 2),
          width: w,
          height: h,
        },
      ]);
      setSelected(0);
      setStage('edit');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load image');
    }
  }, []);

  const handleSave = useCallback(async () => {
    if (!imageBlob || !imageDims) return;
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Give the frame a name first.');
      return;
    }
    if (slots.length === 0) {
      setError('Add at least one photo slot.');
      return;
    }
    if (slots.length > MAX_CUSTOM_FRAME_SLOTS) {
      setError(`A custom frame can have at most ${MAX_CUSTOM_FRAME_SLOTS} photo slots.`);
      return;
    }
    const invalidSlot = slots.findIndex(
      (slot) =>
        !Number.isFinite(slot.x)
        || !Number.isFinite(slot.y)
        || !Number.isFinite(slot.width)
        || !Number.isFinite(slot.height)
        || (slot.rotation !== undefined && !Number.isFinite(slot.rotation))
        || slot.x < 0
        || slot.y < 0
        || slot.width < 20
        || slot.height < 20
        || slot.x + slot.width > imageDims.width
        || slot.y + slot.height > imageDims.height,
    );
    if (invalidSlot >= 0) {
      setError(`Slot ${invalidSlot + 1} must stay within the frame and be at least 20px wide and high.`);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const thumbnail = await makeThumbnail(imageBlob);
      const frame: CustomFrame = {
        id:
          typeof crypto !== 'undefined' && 'randomUUID' in crypto
            ? crypto.randomUUID()
            : `custom-${Date.now()}-${Math.floor(Math.random() * 1e6)}`,
        createdAt: Date.now(),
        name: trimmed,
        output: imageDims,
        slots,
        background: imageBlob,
        thumbnail,
        revealAnimation: slots.length > 1 ? 'strip-print' : 'polaroid-develop',
      };
      await onSave(frame);
      dispatch({ type: 'goto', step: 'home' });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save frame');
    } finally {
      setSaving(false);
    }
  }, [imageBlob, imageDims, name, slots, onSave, dispatch]);

  if (stage === 'upload') {
    return (
      <div className="screen editor-screen">
        <header className="screen-header">
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => dispatch({ type: 'goto', step: 'home' })}
          >
            ← Home
          </button>
          <span className="screen-title">Add a frame</span>
          <span />
        </header>
        <p className="muted editor-hint">
          Upload an image you want to use as a frame. PNG, JPEG, or SVG. Your
          file stays on this device. Nothing is uploaded anywhere.
        </p>
        <div className="upload-area">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => void handleFile(e.target.files?.[0] ?? null)}
          />
          <button
            type="button"
            className="btn btn-primary upload-button"
            onClick={() => fileInputRef.current?.click()}
          >
            Choose a frame image
          </button>
          <p className="muted">
            You'll define one or more photo slot rectangles on top in the next step.
          </p>
        </div>
        {error && <p className="warning">{error}</p>}
      </div>
    );
  }

  return (
    <EditorStage
      imageBlob={imageBlob!}
      imageDims={imageDims!}
      name={name}
      onNameChange={setName}
      slots={slots}
      onSlotsChange={setSlots}
      selected={selected}
      onSelectedChange={setSelected}
      saving={saving}
      error={error}
      onCancel={() => dispatch({ type: 'goto', step: 'home' })}
      onSave={handleSave}
    />
  );
}

function EditorStage({
  imageBlob,
  imageDims,
  name,
  onNameChange,
  slots,
  onSlotsChange,
  selected,
  onSelectedChange,
  saving,
  error,
  onCancel,
  onSave,
}: {
  imageBlob: Blob;
  imageDims: { width: number; height: number };
  name: string;
  onNameChange: (n: string) => void;
  slots: SlotConfig[];
  onSlotsChange: (s: SlotConfig[]) => void;
  selected: number;
  onSelectedChange: (i: number) => void;
  saving: boolean;
  error: string | null;
  onCancel: () => void;
  onSave: () => void;
}) {
  const stageRef = useRef<HTMLDivElement | null>(null);
  const [fitScale, setFitScale] = useState(1);
  const [userZoom, setUserZoom] = useState(1);
  const dragRef = useRef<DragState | null>(null);
  const bgUrl = useObjectUrl(imageBlob);

  const scale = fitScale * userZoom;

  useLayoutEffect(() => {
    function measure() {
      const el = stageRef.current;
      if (!el) return;
      const fit = Math.min(
        el.clientWidth / imageDims.width,
        el.clientHeight / imageDims.height,
      );
      setFitScale(fit > 0 ? fit : 1);
    }
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [imageDims]);

  const updateSlot = useCallback(
    (index: number, patch: Partial<SlotConfig>) => {
      const next = slots.slice();
      next[index] = { ...next[index], ...patch };
      onSlotsChange(next);
    },
    [slots, onSlotsChange],
  );

  const addSlot = useCallback(() => {
    if (slots.length >= MAX_CUSTOM_FRAME_SLOTS) return;
    // Use the currently-selected slot as a template (or a sensible default
    // if there isn't one yet). New slot is offset diagonally so it's visible
    // as a separate rectangle next to the original.
    const reference: SlotConfig =
      slots[selected] ?? {
        x: Math.round(imageDims.width * 0.1),
        y: Math.round(imageDims.height * 0.1),
        width: Math.round(imageDims.width * 0.4),
        height: Math.round(imageDims.height * 0.4),
      };
    const offset = Math.max(
      24,
      Math.round(Math.min(reference.width, reference.height) * 0.08),
    );
    const maxX = Math.max(0, imageDims.width - reference.width);
    const maxY = Math.max(0, imageDims.height - reference.height);
    const next: SlotConfig = {
      ...reference,
      x: Math.min(reference.x + offset, maxX),
      y: Math.min(reference.y + offset, maxY),
    };
    onSlotsChange([...slots, next]);
    onSelectedChange(slots.length);
  }, [imageDims, slots, selected, onSlotsChange, onSelectedChange]);

  const removeSlot = useCallback(() => {
    if (slots.length <= 1) return;
    const next = slots.filter((_, i) => i !== selected);
    onSlotsChange(next);
    onSelectedChange(Math.max(0, selected - 1));
  }, [slots, selected, onSlotsChange, onSelectedChange]);

  const startDrag = useCallback(
    (index: number, handle: Handle) => (e: React.PointerEvent<HTMLElement>) => {
      e.stopPropagation();
      (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
      onSelectedChange(index);
      dragRef.current = {
        pointerId: e.pointerId,
        handle,
        startScreen: { x: e.clientX, y: e.clientY },
        startSlot: slots[index],
        scale,
      };
    },
    [slots, scale, onSelectedChange],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
      const d = dragRef.current;
      if (!d || d.pointerId !== e.pointerId) return;
      const dx = (e.clientX - d.startScreen.x) / d.scale;
      const dy = (e.clientY - d.startScreen.y) / d.scale;
      const s = d.startSlot;
      const minSize = 20;
      let { x, y, width, height } = s;
      switch (d.handle) {
        case 'move': x = s.x + dx; y = s.y + dy; break;
        case 'nw': x = s.x + dx; y = s.y + dy; width = s.width - dx; height = s.height - dy; break;
        case 'ne': y = s.y + dy; width = s.width + dx; height = s.height - dy; break;
        case 'sw': x = s.x + dx; width = s.width - dx; height = s.height + dy; break;
        case 'se': width = s.width + dx; height = s.height + dy; break;
        case 'n':  y = s.y + dy; height = s.height - dy; break;
        case 's':  height = s.height + dy; break;
        case 'e':  width = s.width + dx; break;
        case 'w':  x = s.x + dx; width = s.width - dx; break;
      }
      if (width < minSize) width = minSize;
      if (height < minSize) height = minSize;
      x = Math.max(0, Math.min(x, imageDims.width - minSize));
      y = Math.max(0, Math.min(y, imageDims.height - minSize));
      width = Math.min(width, imageDims.width - x);
      height = Math.min(height, imageDims.height - y);
      updateSlot(selected, {
        x: Math.round(x),
        y: Math.round(y),
        width: Math.round(width),
        height: Math.round(height),
      });
    },
    [imageDims, selected, updateSlot],
  );

  const endDrag = useCallback((e: React.PointerEvent<HTMLElement>) => {
    if (dragRef.current?.pointerId === e.pointerId) dragRef.current = null;
  }, []);

  const zoomOut = useCallback(() => setUserZoom((z) => Math.max(0.25, z / 1.25)), []);
  const zoomIn = useCallback(() => setUserZoom((z) => Math.min(8, z * 1.25)), []);
  const zoomReset = useCallback(() => setUserZoom(1), []);

  return (
    <div className="screen editor-screen">
      <header className="screen-header">
        <button type="button" className="btn btn-ghost" onClick={onCancel} disabled={saving}>
          ← Cancel
        </button>
        <span className="screen-title">Add a frame</span>
        <button
          type="button"
          className="btn btn-primary"
          onClick={onSave}
          disabled={saving || !name.trim()}
        >
          {saving ? 'Saving…' : 'Save frame'}
        </button>
      </header>

      <label className="editor-field editor-name-field">
        <span>Frame name</span>
        <input
          type="text"
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          placeholder="e.g. Birthday strip"
          maxLength={50}
        />
      </label>

      <p className="muted editor-hint">
        {imageDims.width}×{imageDims.height} px · {slots.length}{' '}
        {slots.length === 1 ? 'slot' : 'slots'}. Drag a slot to move; corner/edge
        handles resize. Wheel or pinch in the slot to zoom.
      </p>

      <div className="editor-zoombar">
        <button type="button" className="btn btn-ghost btn-small" onClick={zoomOut} aria-label="Zoom out">−</button>
        <button type="button" className="text-link" onClick={zoomReset}>{Math.round(userZoom * 100)}%</button>
        <button type="button" className="btn btn-ghost btn-small" onClick={zoomIn} aria-label="Zoom in">+</button>
        <span className="muted editor-zoombar-hint">Stage scrolls when zoomed in.</span>
      </div>

      <div ref={stageRef} className="editor-stage">
        <div
          className="editor-frame"
          style={{ width: imageDims.width * scale, height: imageDims.height * scale }}
        >
          {bgUrl && (
            <img
              src={bgUrl}
              alt=""
              className="frame-background"
              style={{ width: imageDims.width * scale, height: imageDims.height * scale }}
            />
          )}
          {slots.map((slot, i) => (
            <div
              key={i}
              className={`editor-slot ${i === selected ? 'selected' : ''}`}
              style={{
                left: slot.x * scale,
                top: slot.y * scale,
                width: slot.width * scale,
                height: slot.height * scale,
              }}
              onPointerDown={startDrag(i, 'move')}
              onPointerMove={onPointerMove}
              onPointerUp={endDrag}
              onPointerCancel={endDrag}
            >
              <span className="editor-slot-label">{i + 1}</span>
              {i === selected && (
                <>
                  {HANDLES_CORNER.map((h) => (
                    <span
                      key={h}
                      className={`editor-handle corner ${h}`}
                      onPointerDown={startDrag(i, h)}
                      onPointerMove={onPointerMove}
                      onPointerUp={endDrag}
                      onPointerCancel={endDrag}
                    />
                  ))}
                  {HANDLES_EDGE.map((h) => (
                    <span
                      key={h}
                      className={`editor-handle edge ${h}`}
                      onPointerDown={startDrag(i, h)}
                      onPointerMove={onPointerMove}
                      onPointerUp={endDrag}
                      onPointerCancel={endDrag}
                    />
                  ))}
                </>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="editor-slot-inputs">
        <div className="editor-slot-tabs" role="tablist">
          {slots.map((_, i) => (
            <button
              key={i}
              type="button"
              role="tab"
              aria-selected={i === selected}
              className={`editor-slot-tab ${i === selected ? 'active' : ''}`}
              onClick={() => onSelectedChange(i)}
            >
              Slot {i + 1}
            </button>
          ))}
          <button
            type="button"
            className="editor-slot-tab editor-slot-add"
            onClick={addSlot}
            disabled={slots.length >= MAX_CUSTOM_FRAME_SLOTS}
            aria-label="Add slot"
          >
            + Add
          </button>
          {slots.length > 1 && (
            <button
              type="button"
              className="editor-slot-tab editor-slot-remove"
              onClick={removeSlot}
              aria-label="Remove selected slot"
            >
              − Remove
            </button>
          )}
        </div>
        <div className="editor-slot-fields">
          {(['x', 'y', 'width', 'height'] as const).map((key) => (
            <label key={key} className="editor-field">
              <span>{key}</span>
              <input
                type="number"
                value={slots[selected]?.[key] ?? 0}
                onChange={(e) => updateSlot(selected, { [key]: Number(e.target.value) })}
              />
            </label>
          ))}
          <label className="editor-field">
            <span>rotation</span>
            <input
              type="number"
              step="0.5"
              value={slots[selected]?.rotation ?? 0}
              onChange={(e) => {
                const v = Number(e.target.value);
                updateSlot(selected, { rotation: v || undefined });
              }}
            />
          </label>
        </div>
      </div>

      {error && <p className="warning">{error}</p>}
    </div>
  );
}
