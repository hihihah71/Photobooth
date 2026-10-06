import { useCallback, useMemo, useState } from 'react';
import type { Action } from '../state/appReducer';
import type { SavedPhoto } from '../types';
import { useGallery } from '../hooks/useGallery';
import { useObjectUrl } from '../hooks/useObjectUrl';
import { downloadBlob } from '../utils/download';
import { CloudShareButton } from '../components/CloudShareButton';

type Props = {
  dispatch: React.Dispatch<Action>;
};

export function GalleryScreen({ dispatch }: Props) {
  const { photos, loading, error, usage, remove, clear } = useGallery();
  const [openId, setOpenId] = useState<string | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);

  const openPhoto = useMemo(
    () => photos.find((p) => p.id === openId) ?? null,
    [photos, openId],
  );

  const handleDeleteAll = useCallback(async () => {
    await clear();
    setConfirmClear(false);
  }, [clear]);

  return (
    <div className="screen gallery-screen">
      <header className="screen-header">
        <button
          type="button"
          className="btn btn-ghost"
          onClick={() => dispatch({ type: 'goto', step: 'home' })}
        >
          ← Home
        </button>
        <span className="screen-title">Gallery</span>
        {photos.length > 0 ? (
          <button
            type="button"
            className="btn btn-ghost btn-danger"
            onClick={() => setConfirmClear(true)}
          >
            Clear All
          </button>
        ) : (
          <span />
        )}
      </header>

      <p className="muted gallery-note">
        Stored locally on this device. Clearing your browser data will remove them.
      </p>

      {loading && <p className="muted">Loading…</p>}
      {error && <p className="warning">Couldn't open gallery: {error}</p>}

      {!loading && !error && photos.length === 0 && (
        <div className="empty-state">
          <p>No photos yet. Create one to get started.</p>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => dispatch({ type: 'goto', step: 'home' })}
          >
            Choose a frame
          </button>
        </div>
      )}

      {photos.length > 0 && (
        <ul className="photo-grid">
          {photos.map((photo) => (
            <PhotoTile key={photo.id} photo={photo} onOpen={() => setOpenId(photo.id)} />
          ))}
        </ul>
      )}

      {usage && (
        <footer className="storage-footer muted">
          Storage: {(usage.usage / (1024 * 1024)).toFixed(1)} MB used
          {usage.quota > 0 &&
            ` of ${(usage.quota / (1024 * 1024 * 1024)).toFixed(1)} GB available`}
        </footer>
      )}

      {openPhoto && (
        <PhotoViewer
          photo={openPhoto}
          onClose={() => setOpenId(null)}
          onDelete={async () => {
            await remove(openPhoto.id);
            setOpenId(null);
          }}
        />
      )}

      {confirmClear && (
        <ConfirmDialog
          title="Clear all photos?"
          message="This will permanently remove every saved photo from this device. It can't be recovered."
          confirmLabel="Clear all"
          danger
          onCancel={() => setConfirmClear(false)}
          onConfirm={handleDeleteAll}
        />
      )}
    </div>
  );
}

function PhotoTile({ photo, onOpen }: { photo: SavedPhoto; onOpen: () => void }) {
  const url = useObjectUrl(photo.thumbnail);
  return (
    <li>
      <button type="button" className="photo-tile" onClick={onOpen}>
        {url && <img src={url} alt={photo.frameName} loading="lazy" />}
      </button>
    </li>
  );
}

function PhotoViewer({
  photo,
  onClose,
  onDelete,
}: {
  photo: SavedPhoto;
  onClose: () => void;
  onDelete: () => Promise<void>;
}) {
  const url = useObjectUrl(photo.blob);
  const [confirming, setConfirming] = useState(false);

  const filename = `photobooth-${photo.frameId}-${photo.id}.png`;

  return (
    <div className="modal" role="dialog" aria-modal="true">
      <div className="modal-backdrop" onClick={onClose} />
      <div className="modal-card">
        <div className="modal-image-wrap">
          {url && <img src={url} alt={photo.frameName} />}
        </div>
        <p className="muted modal-meta">
          {photo.frameName} • {new Date(photo.createdAt).toLocaleString()}
        </p>
        <div className="modal-actions">
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => downloadBlob(photo.blob, filename)}
          >
            Download
          </button>
          <CloudShareButton getBlob={() => photo.blob} filename={filename} />
          <button
            type="button"
            className="btn btn-ghost btn-danger"
            onClick={() => setConfirming(true)}
          >
            Delete
          </button>
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Close
          </button>
        </div>
      </div>

      {confirming && (
        <ConfirmDialog
          title="Delete this photo?"
          message="This will permanently remove the photo from your device. It can't be recovered."
          confirmLabel="Delete"
          danger
          onCancel={() => setConfirming(false)}
          onConfirm={onDelete}
        />
      )}
    </div>
  );
}

function ConfirmDialog({
  title,
  message,
  confirmLabel,
  danger,
  onCancel,
  onConfirm,
}: {
  title: string;
  message: string;
  confirmLabel: string;
  danger?: boolean;
  onCancel: () => void;
  onConfirm: () => void | Promise<void>;
}) {
  return (
    <div className="modal" role="alertdialog" aria-modal="true">
      <div className="modal-backdrop" onClick={onCancel} />
      <div className="modal-card confirm-card">
        <h2 className="modal-title">{title}</h2>
        <p className="muted">{message}</p>
        <div className="modal-actions">
          <button type="button" className="btn btn-ghost" onClick={onCancel}>
            Cancel
          </button>
          <button
            type="button"
            className={`btn ${danger ? 'btn-danger-solid' : 'btn-primary'}`}
            onClick={() => void onConfirm()}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
