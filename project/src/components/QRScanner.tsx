import { useEffect, useRef, useState, useCallback } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { X, QrCode, Loader2, AlertCircle } from 'lucide-react';

interface QRScannerProps {
  /** Called with the decoded text when a QR is successfully scanned */
  onScan: (decodedText: string) => void;
  /** Called when the user closes the scanner */
  onClose: () => void;
}

export default function QRScanner({ onScan, onClose }: QRScannerProps) {
  const [status, setStatus] = useState<'starting' | 'scanning' | 'error'>('starting');
  const [errorMsg, setErrorMsg] = useState('');
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerId = 'qr-scanner-container';

  const stopScanner = useCallback(async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
        scannerRef.current.clear();
      } catch (_) {
        // ignore errors on stop
      }
      scannerRef.current = null;
    }
  }, []);

  const startScanner = useCallback(async () => {
    try {
      const html5QrCode = new Html5Qrcode(containerId);
      scannerRef.current = html5QrCode;

      await html5QrCode.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 240, height: 240 },
        },
        async (decodedText) => {
          await stopScanner();
          onScan(decodedText.trim());
        },
        () => {
          // Scan attempt failure - ignore, keep scanning
        }
      );
      setStatus('scanning');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Camera access denied';
      setErrorMsg(msg);
      setStatus('error');
    }
  }, [onScan, stopScanner]);

  useEffect(() => {
    // Small delay to ensure the container is mounted in the DOM
    const timer = setTimeout(() => {
      startScanner();
    }, 200);

    return () => {
      clearTimeout(timer);
      stopScanner();
    };
  }, [startScanner, stopScanner]);

  const handleClose = async () => {
    await stopScanner();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 text-white">
            <QrCode className="w-5 h-5" />
            <h2 className="font-bold text-lg">Scan QR Code</h2>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="text-white/80 hover:text-white transition-colors p-1 rounded-full hover:bg-white/10"
            aria-label="Close scanner"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scanner area */}
        <div className="p-5">
          {status === 'starting' && (
            <div className="flex flex-col items-center justify-center h-64 gap-3 text-slate-500">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
              <p className="text-sm">Starting camera…</p>
            </div>
          )}

          {status === 'error' && (
            <div className="flex flex-col items-center justify-center h-64 gap-3 text-center px-4">
              <AlertCircle className="w-10 h-10 text-red-500" />
              <p className="font-semibold text-red-700">Camera Error</p>
              <p className="text-sm text-slate-500">{errorMsg}</p>
              <p className="text-xs text-slate-400">
                Please allow camera access in your browser settings and try again.
              </p>
              <button
                onClick={handleClose}
                className="mt-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-sm font-medium transition-colors"
              >
                Close
              </button>
            </div>
          )}

          {/*
            Always keep this div in the DOM with a real size so html5-qrcode
            can inject its <video> element into a laid-out node.
            We hide it visually (not with display:none / "hidden") while the
            scanner is not yet running.
          */}
          <div
            id={containerId}
            style={{ minHeight: status === 'scanning' ? 260 : 0 }}
            className={`rounded-xl overflow-hidden w-full transition-all ${
              status !== 'scanning' ? 'opacity-0 h-0 pointer-events-none' : 'opacity-100'
            }`}
          />

          {status === 'scanning' && (
            <div className="mt-3 text-center">
              <p className="text-sm text-slate-500">
                Point the camera at a devotee's QR wristband or ID card
              </p>
              <div className="mt-2 flex items-center justify-center gap-1.5">
                <span className="inline-block w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-xs text-green-600 font-medium">Scanning…</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
