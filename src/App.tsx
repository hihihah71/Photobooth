import { useMemo, useReducer } from 'react';
import { appReducer, initialState } from './state/appReducer';
import { frames as builtInFrames } from './config/frames';
import { useCustomFrames } from './hooks/useCustomFrames';
import { useSlotImageUrlCleanup } from './hooks/useSlotImageUrlCleanup';
import { HomeScreen } from './screens/HomeScreen';
import { CaptureScreen } from './screens/CaptureScreen';
import { AdjustScreen } from './screens/AdjustScreen';
import { PreviewScreen } from './screens/PreviewScreen';
import { GalleryScreen } from './screens/GalleryScreen';
import { FrameEditorScreen } from './screens/FrameEditorScreen';
import { AddFrameScreen } from './screens/AddFrameScreen';

function App() {
  const [state, dispatch] = useReducer(appReducer, initialState);
  const { customFrames, save: saveCustomFrame, remove: removeCustomFrame } = useCustomFrames();
  useSlotImageUrlCleanup(state.slotImages);

  // Custom frames first (newest at top from IndexedDB) followed by built-ins.
  const allFrames = useMemo(
    () => [...customFrames, ...builtInFrames],
    [customFrames],
  );
  const customIds = useMemo(
    () => new Set(customFrames.map((f) => f.id)),
    [customFrames],
  );

  const frame = allFrames.find((f) => f.id === state.frameId) ?? null;

  return (
    <div className="app fade-in">
      {state.step === 'home' && (
        <HomeScreen
          dispatch={dispatch}
          allFrames={allFrames}
          customIds={customIds}
          onRemoveCustom={removeCustomFrame}
        />
      )}
      {state.step === 'capture' && frame && (
        <CaptureScreen state={state} frame={frame} dispatch={dispatch} />
      )}
      {state.step === 'adjust' && frame && (
        <AdjustScreen
          state={state}
          frame={frame}
          dispatch={dispatch}
        />
      )}
      {state.step === 'preview' && frame && (
        <PreviewScreen state={state} frame={frame} dispatch={dispatch} />
      )}
      {state.step === 'gallery' && <GalleryScreen dispatch={dispatch} />}
      {state.step === 'edit' && <FrameEditorScreen dispatch={dispatch} />}
      {state.step === 'add-frame' && (
        <AddFrameScreen dispatch={dispatch} onSave={saveCustomFrame} />
      )}
    </div>
  );
}

export default App;
