export type SlotConfig = {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
};

export type FrameDecoration = {
  image: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
};

export type FrameBackground =
  | { color: string }
  | { image: string };

export type FrameConfig = {
  id: string;
  name: string;
  thumbnail: string;
  /** Optional: transparent PNG/SVG drawn ON TOP of slot images. */
  overlay?: string;
  output: { width: number; height: number };
  slots: SlotConfig[];
  /** Drawn under slot images. Use this when the frame artwork IS the
   *  background (slot windows are openings in a full-bleed design). */
  background?: FrameBackground;
  decorations?: FrameDecoration[];
  revealAnimation?: 'polaroid-develop' | 'strip-print' | 'fade-in' | string;
  className?: string;
};

export type SlotTransform = {
  offsetX: number;
  offsetY: number;
  scale: number;
};

export type SlotImage = {
  image: HTMLImageElement;
  sourceUrl: string;
  transform: SlotTransform;
};

export type PhotoFilterId = 'natural' | 'bright' | 'warm' | 'soft' | 'vivid';

export type AppStep =
  | 'home'
  | 'capture'
  | 'adjust'
  | 'preview'
  | 'gallery'
  | 'edit'
  | 'add-frame';

export type AppState = {
  step: AppStep;
  frameId: string | null;
  slotImages: (SlotImage | null)[];
  activeSlot: number;
  photoFilter: PhotoFilterId;
};

export type SavedPhoto = {
  id: string;
  createdAt: number;
  frameId: string;
  frameName: string;
  blob: Blob;
  thumbnail: Blob;
};

/**
 * A frame the user uploaded and configured themselves. Stored in IndexedDB.
 * At runtime it gets materialized into a regular FrameConfig (blobs → object URLs).
 */
export type CustomFrame = {
  id: string;
  createdAt: number;
  name: string;
  output: { width: number; height: number };
  slots: SlotConfig[];
  /** The uploaded image, rendered as background of the frame. */
  background: Blob;
  /** Downscaled thumbnail (~256px) for the home grid. */
  thumbnail: Blob;
  revealAnimation?: string;
};
