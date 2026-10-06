import { useState } from 'react';
import type { Action } from '../state/appReducer';
import type { FrameConfig } from '../types';
import { FrameCard } from '../components/FrameCard';

type Props = {
  dispatch: React.Dispatch<Action>;
  allFrames: FrameConfig[];
  customIds: Set<string>;
  onRemoveCustom: (id: string) => Promise<void>;
};

const PRIVACY_DISMISSED_KEY = 'photobooth.privacyDismissed';

export function HomeScreen({ dispatch, allFrames, customIds, onRemoveCustom }: Props) {
  const [privacyOpen, setPrivacyOpen] = useState(
    () => typeof window !== 'undefined' && localStorage.getItem(PRIVACY_DISMISSED_KEY) !== '1',
  );
  const [confirmDelete, setConfirmDelete] = useState<FrameConfig | null>(null);

  function dismissPrivacy() {
    localStorage.setItem(PRIVACY_DISMISSED_KEY, '1');
    setPrivacyOpen(false);
  }

  return (
    <div className="screen home-screen">
      <header className="home-header">
        <div>
          <h1 className="home-title">Photobooth</h1>
          <p className="home-subtitle">Pick a frame. Strike a pose.</p>
        </div>
      </header>

      {privacyOpen && (
        <div className="privacy-banner" role="note">
          <span>
            Photos stay on this device unless you press Share. Shared photos are uploaded to
            Cloudinary so another device can download them.
          </span>
          <button
            type="button"
            className="btn btn-ghost btn-small"
            onClick={dismissPrivacy}
            aria-label="Dismiss privacy notice"
          >
            ✕
          </button>
        </div>
      )}

      <section className="frame-grid" aria-label="Choose a frame">
        {allFrames.map((frame) => (
          <div key={frame.id} className="frame-card-wrap">
            <FrameCard
              frame={frame}
              onSelect={() =>
                dispatch({
                  type: 'selectFrame',
                  frameId: frame.id,
                  slotCount: frame.slots.length,
                })
              }
            />
            {customIds.has(frame.id) && (
              <button
                type="button"
                className="frame-card-delete"
                onClick={(e) => {
                  e.stopPropagation();
                  setConfirmDelete(frame);
                }}
                aria-label={`Delete ${frame.name}`}
                title="Delete this custom frame"
              >
                ✕
              </button>
            )}
          </div>
        ))}
      </section>

      <footer className="home-footer">
        <a
          className="author-credit"
          href="https://github.com/hihihah71"
          target="_blank"
          rel="noopener noreferrer"
        >
          Made by hihihah71
        </a>
        <span className="app-version" aria-label={`Version ${__APP_VERSION__}`}>
          v{__APP_VERSION__}
        </span>
      </footer>

      {confirmDelete && (
        <div className="modal" role="alertdialog" aria-modal="true">
          <div className="modal-backdrop" onClick={() => setConfirmDelete(null)} />
          <div className="modal-card confirm-card">
            <h2 className="modal-title">Delete "{confirmDelete.name}"?</h2>
            <p className="muted">
              This removes the custom frame from this device. Photos already
              downloaded or shared are not affected.
            </p>
            <div className="modal-actions">
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setConfirmDelete(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-danger-solid"
                onClick={async () => {
                  await onRemoveCustom(confirmDelete.id);
                  setConfirmDelete(null);
                }}
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
