import { useEffect, useImperativeHandle, useRef } from 'react';
import type { FrameConfig, PhotoFilterId, SlotImage } from '../types';
import { drawComposite } from '../utils/composite';

export type CompositeCanvasHandle = {
  toBlob: () => Promise<Blob>;
};

type Props = {
  frame: FrameConfig;
  slotImages: (SlotImage | null)[];
  photoFilter: PhotoFilterId;
  className?: string;
  ref?: React.Ref<CompositeCanvasHandle>;
};

export function CompositeCanvas({ frame, slotImages, photoFilter, className, ref }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const lastBlobRef = useRef<Promise<Blob> | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let cancelled = false;
    const job = drawComposite(canvas, frame, slotImages, photoFilter);
    lastBlobRef.current = job;
    job.catch((err) => {
      if (!cancelled) console.error('Composite render failed', err);
    });
    return () => {
      cancelled = true;
    };
  }, [frame, slotImages, photoFilter]);

  useImperativeHandle(
    ref,
    () => ({
      toBlob: async () => {
        const canvas = canvasRef.current;
        if (!canvas) throw new Error('Canvas not mounted');
        await drawComposite(canvas, frame, slotImages, photoFilter);
        return new Promise<Blob>((resolve, reject) => {
          canvas.toBlob(
            (blob) => {
              if (blob) resolve(blob);
              else reject(new Error('Failed to encode composite'));
            },
            'image/png',
          );
        });
      },
    }),
    [frame, slotImages, photoFilter],
  );

  return <canvas ref={canvasRef} className={`composite-canvas ${className ?? ''}`} />;
}
