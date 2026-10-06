import type { AppState, AppStep, SlotImage, SlotTransform } from '../types';

export type Action =
  | { type: 'selectFrame'; frameId: string; slotCount: number }
  | { type: 'swapFrame'; frameId: string; slotCount: number }
  | { type: 'goto'; step: AppStep }
  | { type: 'setSlotImage'; index: number; image: SlotImage }
  | { type: 'clearSlotImage'; index: number }
  | { type: 'swapSlots'; a: number; b: number }
  | { type: 'updateSlotTransform'; index: number; transform: SlotTransform }
  | { type: 'setActiveSlot'; index: number }
  | { type: 'reset' };

export const initialState: AppState = {
  step: 'home',
  frameId: null,
  slotImages: [],
  activeSlot: 0,
};

export function appReducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'selectFrame':
      return {
        step: 'capture',
        frameId: action.frameId,
        slotImages: Array(action.slotCount).fill(null),
        activeSlot: 0,
      };

    case 'swapFrame': {
      // Preserve every captured image. The slotImages array grows to the
      // larger of the previous length and the new frame's slot count, so
      // swapping to a smaller frame doesn't drop the tail. Swapping back to
      // a larger frame brings those photos back into view. Iterators consume
      // frame.slots, not slotImages.length, so any indices past the current
      // frame's slot count are simply not rendered (but still kept in state).
      const targetLen = Math.max(state.slotImages.length, action.slotCount);
      const next: (SlotImage | null)[] = new Array(targetLen).fill(null);
      for (let i = 0; i < state.slotImages.length; i++) {
        next[i] = state.slotImages[i];
      }
      const firstEmpty = next.slice(0, action.slotCount).findIndex((slotImage) => slotImage === null);
      return {
        ...state,
        frameId: action.frameId,
        slotImages: next,
        activeSlot: firstEmpty >= 0 ? firstEmpty : 0,
      };
    }

    case 'goto':
      return { ...state, step: action.step };

    case 'setSlotImage': {
      const next = state.slotImages.slice();
      next[action.index] = action.image;
      return { ...state, slotImages: next };
    }

    case 'clearSlotImage': {
      const next = state.slotImages.slice();
      next[action.index] = null;
      return { ...state, slotImages: next };
    }

    case 'swapSlots': {
      if (action.a === action.b) return state;
      const next = state.slotImages.slice();
      const tmp = next[action.a] ?? null;
      next[action.a] = next[action.b] ?? null;
      next[action.b] = tmp;
      return { ...state, slotImages: next };
    }

    case 'updateSlotTransform': {
      const current = state.slotImages[action.index];
      if (!current) return state;
      const next = state.slotImages.slice();
      next[action.index] = { ...current, transform: action.transform };
      return { ...state, slotImages: next };
    }

    case 'setActiveSlot':
      return { ...state, activeSlot: action.index };

    case 'reset':
      return initialState;

    default:
      return state;
  }
}
