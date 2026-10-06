import { useCallback, useEffect, useState } from 'react';
import QRCode from 'qrcode';
import {
  uploadPhotoForSharing,
  type CloudinaryShareResult,
} from '../utils/cloudinaryShare';

type Props = {
  getBlob: () => Blob | Promise<Blob>;
  filename: string;
};

export function CloudShareButton({ getBlob, filename }: Props) {
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<CloudinaryShareResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleShare = useCallback(async () => {
    if (uploading) return;
    setUploading(true);
    setError(null);
    try {
      const blob = await getBlob();
      setResult(await uploadPhotoForSharing(blob, filename));
    } catch (err) {
      console.error('Failed to create share link', err);
      setError(err instanceof Error ? err.message : 'Could not create a share link.');
    } finally {
      setUploading(false);
    }
  }, [filename, getBlob, uploading]);

  return (
    <div className="cloud-share-control">
      <button
        type="button"
        className="btn btn-ghost"
        onClick={() => void handleShare()}
        disabled={uploading}
        aria-busy={uploading}
      >
        {uploading ? 'Creating link…' : 'Share'}
      </button>
      {error && <span className="warning cloud-share-error">{error}</span>}
      {result && <CloudShareDialog result={result} onClose={() => setResult(null)} />}
    </div>
  );
}

function CloudShareDialog({
  result,
  onClose,
}: {
  result: CloudinaryShareResult;
  onClose: () => void;
}) {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [qrError, setQrError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let active = true;
    QRCode.toDataURL(result.downloadUrl, {
      width: 320,
      margin: 2,
      errorCorrectionLevel: 'M',
      color: { dark: '#1f2430', light: '#ffffff' },
    })
      .then((url) => {
        if (active) setQrDataUrl(url);
      })
      .catch((err: unknown) => {
        console.error('Failed to generate QR code', err);
        if (active) setQrError('Could not generate the QR code. Use the link below.');
      });
    return () => {
      active = false;
    };
  }, [result.downloadUrl]);

  const copyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(result.downloadUrl);
      setCopied(true);
    } catch {
      setQrError('Copy failed. Select and copy the link manually.');
    }
  }, [result.downloadUrl]);

  return (
    <div className="modal" role="dialog" aria-modal="true" aria-labelledby="share-dialog-title">
      <div className="modal-backdrop" onClick={onClose} />
      <div className="modal-card share-card">
        <h2 id="share-dialog-title" className="modal-title">Scan to download</h2>
        <p className="muted share-help">
          Scan this QR code with a phone. The photo link will start a download from Cloudinary.
        </p>

        <div className="share-qr-wrap" aria-live="polite">
          {qrDataUrl
            ? <img src={qrDataUrl} alt="QR code for downloading this photo" />
            : <span className="muted">Generating QR code…</span>}
        </div>

        {qrError && <p className="warning share-message">{qrError}</p>}
        <label className="share-link-label" htmlFor="share-download-link">Download link</label>
        <input
          id="share-download-link"
          className="share-link-input"
          value={result.downloadUrl}
          readOnly
          onFocus={(event) => event.currentTarget.select()}
        />
        <p className="muted share-privacy-note">
          Anyone with this link can access the uploaded photo.
        </p>
        <div className="modal-actions">
          <button type="button" className="btn btn-primary" onClick={() => void copyLink()}>
            {copied ? 'Copied!' : 'Copy link'}
          </button>
          <a className="btn btn-ghost" href={result.downloadUrl} target="_blank" rel="noreferrer">
            Test download
          </a>
          <button type="button" className="btn btn-ghost" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}
