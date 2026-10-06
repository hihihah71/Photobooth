import { prepareShareImage } from './shareImageOptimization';

export type CloudinaryShareResult = {
  viewUrl: string;
  downloadUrl: string;
  publicId: string;
};

type CloudinaryUploadResponse = {
  public_id?: unknown;
  secure_url?: unknown;
  error?: { message?: unknown };
};

const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME?.trim();
const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET?.trim();

export const cloudinaryShareConfigured = Boolean(cloudName && uploadPreset);

export async function uploadPhotoForSharing(
  blob: Blob,
  filename: string,
): Promise<CloudinaryShareResult> {
  if (!cloudName || !uploadPreset) {
    throw new Error(
      'Cloud sharing is not configured. Set VITE_CLOUDINARY_CLOUD_NAME and VITE_CLOUDINARY_UPLOAD_PRESET.',
    );
  }

  const prepared = await prepareShareImage(blob, filename);
  const form = new FormData();
  form.append(
    'file',
    new File([prepared.blob], prepared.filename, { type: prepared.blob.type || 'image/jpeg' }),
  );
  form.append('upload_preset', uploadPreset);

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${encodeURIComponent(cloudName)}/image/upload`,
    { method: 'POST', body: form },
  );

  const body = await readUploadResponse(response);
  if (!response.ok) {
    const message = typeof body.error?.message === 'string'
      ? body.error.message
      : `Cloudinary upload failed (${response.status})`;
    throw new Error(message);
  }

  if (typeof body.secure_url !== 'string' || typeof body.public_id !== 'string') {
    throw new Error('Cloudinary returned an invalid upload response.');
  }

  const viewUrl = validateCloudinaryUrl(body.secure_url);
  return {
    viewUrl,
    downloadUrl: makeCloudinaryAttachmentUrl(viewUrl, prepared.filename),
    publicId: body.public_id,
  };
}

async function readUploadResponse(response: Response): Promise<CloudinaryUploadResponse> {
  try {
    return await response.json() as CloudinaryUploadResponse;
  } catch {
    return {};
  }
}

function validateCloudinaryUrl(value: string): string {
  const url = new URL(value);
  if (url.protocol !== 'https:' || url.hostname !== 'res.cloudinary.com') {
    throw new Error('Cloudinary returned an unexpected delivery URL.');
  }
  return url.toString();
}

export function makeCloudinaryAttachmentUrl(viewUrl: string, filename: string): string {
  const safeName = filename
    .replace(/\.[^.]+$/, '')
    .replace(/[^a-zA-Z0-9_-]/g, '-')
    .slice(0, 80) || 'photobooth';
  const marker = '/image/upload/';
  if (!viewUrl.includes(marker)) return viewUrl;
  return viewUrl.replace(marker, `${marker}fl_attachment:${safeName}/`);
}
