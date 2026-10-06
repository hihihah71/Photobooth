import { useEffect, useState } from 'react';
import type { Action } from '../state/appReducer';
import type { FrameConfig } from '../types';
import { FrameCard } from '../components/FrameCard';
import { listPhotos } from '../utils/storage';

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
  const [galleryCount, setGalleryCount] = useState<number | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<FrameConfig | null>(null);

  useEffect(() => {
    listPhotos()
      .then((photos) => setGalleryCount(photos.length))
      .catch(() => setGalleryCount(0));
  }, []);

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
        <button
          type="button"
          className="btn btn-ghost gallery-link"
          onClick={() => dispatch({ type: 'goto', step: 'gallery' })}
        >
          Gallery
          {galleryCount !== null && galleryCount > 0 && (
            <span className="badge">{galleryCount}</span>
          )}
        </button>
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
        <button
          type="button"
          className="frame-card frame-card-add"
          onClick={() => dispatch({ type: 'goto', step: 'add-frame' })}
        >
          <div className="frame-card-thumb frame-card-add-thumb">
            <span aria-hidden="true">+</span>
          </div>
          <div className="frame-card-meta">
            <span className="frame-card-name">Add a frame</span>
            <span className="frame-card-slots">Upload your own</span>
          </div>
        </button>
      </section>

      <footer className="home-footer">
        <a
          className="author-credit"
          href="https://github.com/Zyttal"
          target="_blank"
          rel="noopener noreferrer"
        >
          Made by Zyttal
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
              This removes the custom frame from this device. Saved photos already
              made with it remain in your gallery.
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
