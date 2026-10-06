export function fileToImage(input: Blob | string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = typeof input === 'string' ? input : URL.createObjectURL(input);
    const shouldRevoke = typeof input !== 'string';
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => {
      if (shouldRevoke) URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      if (shouldRevoke) URL.revokeObjectURL(url);
      reject(new Error('Failed to load image'));
    };
    img.src = url;
  });
}
