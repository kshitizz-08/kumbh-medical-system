import { useEffect, useRef, useState, useCallback } from 'react';
import { Download, Loader2 } from 'lucide-react';
import { renderQRToCanvas, generateQRDataURL, downloadQR } from '../utils/qrUtils';

interface QRCodeDisplayProps {
  /** The value to encode in the QR code */
  value: string;
  /** Canvas size in pixels (default: 180) */
  size?: number;
  /** Optional label shown below the QR code */
  label?: string;
  /** If true, shows a Download PNG button */
  downloadable?: boolean;
  /** Filename for download (without extension) */
  downloadFilename?: string;
  /** Called with the QR data URL once generated (useful for parent print actions) */
  onQRReady?: (dataURL: string) => void;
}

export default function QRCodeDisplay({
  value,
  size = 180,
  label,
  downloadable = false,
  downloadFilename = 'kumbh-qr',
  onQRReady,
}: QRCodeDisplayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [qrDataURL, setQrDataURL] = useState<string | null>(null);

  const generate = useCallback(async () => {
    if (!canvasRef.current || !value) return;
    setLoading(true);
    setError(false);
    try {
      await renderQRToCanvas(canvasRef.current, value, size);
      const dataURL = await generateQRDataURL(value, size);
      setQrDataURL(dataURL);
      if (onQRReady) onQRReady(dataURL);
    } catch (e) {
      console.error('QR generation failed:', e);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [value, size, onQRReady]);

  useEffect(() => {
    generate();
  }, [generate]);

  const handleDownload = () => {
    if (!qrDataURL) return;
    downloadQR(qrDataURL, downloadFilename);
  };

  return (
    <div className="flex flex-col items-center gap-3">
      <div
        className="relative rounded-xl border-2 border-orange-200 bg-white shadow-md p-2"
        style={{ width: size + 16, height: size + 16 }}
      >
        {loading && (
          <div
            className="absolute inset-0 flex items-center justify-center bg-white rounded-xl"
          >
            <Loader2 className="w-6 h-6 animate-spin text-orange-500" />
          </div>
        )}
        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-red-50 rounded-xl">
            <span className="text-xs text-red-500 text-center px-2">Failed to generate QR</span>
          </div>
        )}
        <canvas
          ref={canvasRef}
          width={size}
          height={size}
          className="rounded-lg block"
          aria-label={`QR code for ${label || value}`}
          style={{ opacity: loading ? 0 : 1, transition: 'opacity 0.3s' }}
        />
      </div>

      {label && (
        <p className="text-xs font-mono font-semibold text-slate-600 tracking-wider text-center max-w-[200px] truncate">
          {label}
        </p>
      )}

      {downloadable && qrDataURL && (
        <button
          type="button"
          onClick={handleDownload}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-orange-50 hover:bg-orange-100 text-orange-700 border border-orange-200 rounded-lg text-xs font-semibold transition-colors shadow-sm hover:shadow"
        >
          <Download className="w-3.5 h-3.5" />
          Download QR
        </button>
      )}
    </div>
  );
}
