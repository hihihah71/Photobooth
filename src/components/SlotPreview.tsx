import { useRef } from 'react';
import type { PhotoFilterId, SlotConfig, SlotImage } from '../types';
import { useSlotTransform } from '../hooks/useSlotTransform';
import { getPhotoFilter } from '../config/photoFilters';

type Props = {
  slot: SlotConfig;
  slotImage: SlotImage | null;
  scale: number;
  photoFilter?: PhotoFilterId;
  /** Lets gestures bind at all (i.e. the AdjustScreen). */
  interactive?: boolean;
  /** Visual selection highlight. Independent of gesture behavior. */
  outlined?: boolean;
  /** Role in the in-progress photo swap, if any.
   *  'source' = this is the slot whose photo is being moved.
   *  'target' = this is a candidate destination for the swap.
   *  null     = not in swap mode (or swap mode not concerning this slot). */
  swapMode?: 'source' | 'target' | null;
  onTransformChange?: (next: SlotImage['transform']) => void;
  /** Tap target. Fires on a pointerup that did not move past the threshold. */
  onTap?: () => void;
  /** Custom UI for the empty state (e.g. "+ Add photo"). */
  placeholder?: React.ReactNode;
};

const TAP_THRESHOLD_PX = 6;

/**
 * Renders one slot as an absolutely-positioned, clipped box containing the
 * user image. Coordinates and dimensions are given in the frame's output
 * coordinate space and multiplied by `scale` for on-screen rendering.
 *
 * When interactive: drag pans the image, pinch / wheel zoom. A pointerup
 * with less than TAP_THRESHOLD_PX of movement fires onTap. Transform is
 * clamped so the image always fully covers the slot.
 */
export function SlotPreview({
  slot,
  slotImage,
  scale,
  photoFilter = 'natural',
  interactive = false,
  outlined = false,
  swapMode = null,
  onTransformChange,
  onTap,
  placeholder,
}: Props) {
  // Clamp the transform so the user image always fully covers the slot.
  // Image at scale s is (slot.width * s) wide; centered, it can be panned
  // up to ((s - 1) * slot.width) / 2 in either direction before its edge
  // reaches the slot boundary. Scale is clamped to [1, 4].
  const clampTransform = (t: SlotImage['transform']): SlotImage['transform'] => {
    const s = Math.max(1, Math.min(4, t.scale));
    const maxOffsetX = ((s - 1) * slot.width) / 2;
    const maxOffsetY = ((s - 1) * slot.height) / 2;
    return {
      scale: s,
      offsetX: Math.max(-maxOffsetX, Math.min(maxOffsetX, t.offsetX)),
      offsetY: Math.max(-maxOffsetY, Math.min(maxOffsetY, t.offsetY)),
    };
  };

  const { bind } = useSlotTransform(
    slotImage?.transform ?? { offsetX: 0, offsetY: 0, scale: 1 },
    (t) => onTransformChange?.(clampTransform(t)),
  );

  const pointerStartRef = useRef<{ x: number; y: number } | null>(null);
  const movedRef = useRef(false);

  // 'pan-y' lets a single-finger vertical swipe scroll the page through
  // the slot. Horizontal drag still becomes a reposition, and a two-finger
  // pinch is still consumed by the zoom handler.
  const touchAction = interactive ? 'pan-y' : undefined;

  const style: React.CSSProperties = {
    position: 'absolute',
    left: slot.x * scale,
    top: slot.y * scale,
    width: slot.width * scale,
    height: slot.height * scale,
    overflow: 'hidden',
    transform: slot.rotation ? `rotate(${slot.rotation}deg)` : undefined,
    touchAction,
  };

  function handlePointerDown(e: React.PointerEvent) {
    pointerStartRef.current = { x: e.clientX, y: e.clientY };
    movedRef.current = false;
    if (interactive) bind.onPointerDown(e);
  }

  function handlePointerMove(e: React.PointerEvent) {
    const start = pointerStartRef.current;
    if (start) {
      const dx = e.clientX - start.x;
      const dy = e.clientY - start.y;
      if (dx * dx + dy * dy > TAP_THRESHOLD_PX * TAP_THRESHOLD_PX) {
        movedRef.current = true;
      }
    }
    if (interactive) bind.onPointerMove(e);
  }

  function handlePointerUp(e: React.PointerEvent) {
    if (interactive) bind.onPointerUp(e);
    if (!movedRef.current && onTap) onTap();
    pointerStartRef.current = null;
  }

  function handlePointerCancel(e: React.PointerEvent) {
    if (interactive) bind.onPointerCancel(e);
    pointerStartRef.current = null;
  }

  function handleWheel(e: React.WheelEvent) {
    if (interactive && slotImage) bind.onWheel(e);
  }

  const className = [
    'slot-preview',
    !slotImage && 'slot-empty',
    interactive && onTap && 'slot-tappable',
    outlined && 'slot-outlined',
    swapMode === 'source' && 'slot-swap-source',
    swapMode === 'target' && 'slot-swap-target',
  ]
    .filter(Boolean)
    .join(' ');

  if (!slotImage) {
    return (
      <div
        className={className}
        style={style}
        onPointerDown={interactive ? handlePointerDown : undefined}
        onPointerMove={interactive ? handlePointerMove : undefined}
        onPointerUp={interactive ? handlePointerUp : undefined}
        onPointerCancel={interactive ? handlePointerCancel : undefined}
      >
        {placeholder}
      </div>
    );
  }

  const t = clampTransform(slotImage.transform);
  const imgStyle: React.CSSProperties = {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    transform: `translate(${t.offsetX * scale}px, ${t.offsetY * scale}px) scale(${t.scale})`,
    transformOrigin: 'center center',
    pointerEvents: 'none',
    filter: getPhotoFilter(photoFilter).css,
  };

  return (
    <div
      className={className}
      style={style}
      onPointerDown={interactive ? handlePointerDown : undefined}
      onPointerMove={interactive ? handlePointerMove : undefined}
      onPointerUp={interactive ? handlePointerUp : undefined}
      onPointerCancel={interactive ? handlePointerCancel : undefined}
      onWheel={interactive ? handleWheel : undefined}
    >
      <img src={slotImage.sourceUrl} alt="" style={imgStyle} draggable={false} />
    </div>
  );
}
