import { useEffect, useRef, useState } from 'react';
import { Camera, CameraOff, CheckCircle2, ScanFace, Upload } from 'lucide-react';
import {
  extractFaceDescriptorFromSource,
  loadImageFileToElement,
  type FaceCaptureResult,
} from '../lib/faceLock.ts';
import { useI18n } from '../lib/i18n.tsx';

interface FaceCapturePanelProps {
  actionLabel: string;
  busy?: boolean;
  onCapture: (result: FaceCaptureResult) => Promise<void> | void;
  capturedPreview?: string | null;
}

export function FaceCapturePanel({
  actionLabel,
  busy = false,
  onCapture,
  capturedPreview = null,
}: FaceCapturePanelProps) {
  const { t } = useI18n();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [cameraActive, setCameraActive] = useState(false);
  const [cameraStarting, setCameraStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [localPreview, setLocalPreview] = useState<string | null>(capturedPreview);

  useEffect(() => {
    setLocalPreview(capturedPreview);
  }, [capturedPreview]);

  const stopCamera = () => {
    if (streamRef.current) {
      for (const track of streamRef.current.getTracks()) {
        track.stop();
      }
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  };

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        for (const track of streamRef.current.getTracks()) {
          track.stop();
        }
      }
    };
  }, []);

  const startCamera = async () => {
    setError(null);
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setError('Camera API is unavailable in this browser. Use "Upload Face Photo" below.');
      return;
    }
    setCameraStarting(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 480 }, height: { ideal: 360 } },
        audio: false,
      });
      streamRef.current = stream;
      setCameraActive(true);
      requestAnimationFrame(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
      });
    } catch (err) {
      setError(
        err instanceof Error
          ? `Camera access failed (${err.message}). You can use "Upload Face Photo" instead.`
          : 'Could not open camera. Please allow camera access or upload a face photo.'
      );
      stopCamera();
    } finally {
      setCameraStarting(false);
    }
  };

  const handleCaptureFromCamera = async () => {
    setError(null);
    if (!videoRef.current || !cameraActive) {
      setError('Start the camera first, or upload a face photo.');
      return;
    }
    try {
      const result = extractFaceDescriptorFromSource(videoRef.current);
      setLocalPreview(result.previewDataUrl);
      await onCapture(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Face capture failed.');
    }
  };

  const handleUploadPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setError(null);
    try {
      const img = await loadImageFileToElement(file);
      const result = extractFaceDescriptorFromSource(img);
      setLocalPreview(result.previewDataUrl);
      await onCapture(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not analyze face photo.');
    }
  };

  return (
    <div className="space-y-3">
      <div className="relative bg-[#222B33] border border-[#E6E2D8] rounded-[4px] overflow-hidden aspect-[4/3] max-h-64 w-full flex items-center justify-center">
        {cameraActive ? (
          <>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover scale-x-[-1]"
            />
            <div
              className="pointer-events-none absolute inset-0 flex items-center justify-center"
              aria-hidden="true"
            >
              <div className="w-36 h-44 rounded-full border-2 border-[#FF9933] border-dashed" />
            </div>
          </>
        ) : localPreview ? (
          <div className="flex flex-col items-center gap-2 p-4">
            <img
              src={localPreview}
              alt="Captured face preview"
              className="w-28 h-28 rounded-[4px] object-cover border-2 border-[#138808]"
            />
            <div className="inline-flex items-center gap-1.5 text-xs text-white font-medium">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#FF9933]" />
              <span>{t('faceCapturedLabel')}</span>
            </div>
          </div>
        ) : (
          <div className="text-center px-6 py-8 text-white/85 space-y-2">
            <ScanFace className="w-10 h-10 mx-auto text-[#FF9933]" />
            <p className="text-xs leading-relaxed">{t('faceLockSub')}</p>
          </div>
        )}
      </div>

      {error && (
        <div className="px-3 py-2 bg-[#FDF2F2] border border-[#B3261E] text-[#B3261E] text-xs rounded-[4px]">
          {error}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {!cameraActive ? (
          <button
            type="button"
            disabled={cameraStarting || busy}
            onClick={startCamera}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold bg-white border border-[#0B5D1E] hover:bg-[#FAF8F3] text-[#0B5D1E] rounded-[4px] cursor-pointer"
          >
            <Camera className="w-3.5 h-3.5 text-[#0B5D1E]" />
            <span>{cameraStarting ? '...' : t('startCameraBtn')}</span>
          </button>
        ) : (
          <>
            <button
              type="button"
              disabled={busy}
              onClick={handleCaptureFromCamera}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold bg-[#0B5D1E] hover:bg-[#094a17] disabled:opacity-50 text-white rounded-[4px] cursor-pointer"
            >
              <ScanFace className="w-3.5 h-3.5" />
              <span>{busy ? '...' : actionLabel}</span>
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={stopCamera}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-white border border-[#222B33]/40 hover:bg-[#FAF8F3] text-[#222B33] rounded-[4px] cursor-pointer"
            >
              <CameraOff className="w-3.5 h-3.5" />
              <span>{t('stopCameraBtn')}</span>
            </button>
          </>
        )}

        <label className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-[#FAF8F3] hover:bg-[#E6E2D8]/50 border border-[#222B33]/40 text-[#222B33] rounded-[4px] cursor-pointer">
          <Upload className="w-3.5 h-3.5 text-[#222B33]" />
          <span>{t('uploadSelfieBtn')}</span>
          <input
            type="file"
            accept="image/*"
            capture="user"
            onChange={handleUploadPhoto}
            disabled={busy}
            className="hidden"
          />
        </label>
      </div>
    </div>
  );
}
