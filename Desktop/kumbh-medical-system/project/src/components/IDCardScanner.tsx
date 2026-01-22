import { useState, useRef, useEffect } from 'react';
import { Camera, X, Loader2, ScanLine } from 'lucide-react';
import Tesseract from 'tesseract.js';
import { useI18n } from '../i18n/i18n';

type IDScannerProps = {
    onScanComplete: (data: Partial<{
        name: string;
        idNumber: string;
        age: string;
        gender: string;
        address: string;
    }>) => void;
    onClose: () => void;
};

export default function IDScanner({ onScanComplete, onClose }: IDScannerProps) {
    const { t } = useI18n();
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [stream, setStream] = useState<MediaStream | null>(null);

    useEffect(() => {
        const startCamera = async () => {
            try {
                const mediaStream = await navigator.mediaDevices.getUserMedia({
                    video: { facingMode: 'environment' } // Use back camera for scanning
                });
                setStream(mediaStream);
                if (videoRef.current) {
                    videoRef.current.srcObject = mediaStream;
                }
            } catch (err) {
                console.error("Camera error", err);
                alert(t('selfie.failCamera'));
            }
        };

        startCamera();

        return () => {
            if (stream) stream.getTracks().forEach(track => track.stop());
        };
    }, []);

    const captureAndScan = async () => {
        if (!videoRef.current || !canvasRef.current) return;

        setIsProcessing(true);
        const video = videoRef.current;
        const canvas = canvasRef.current;

        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');

        if (ctx) {
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            const dataUrl = canvas.toDataURL('image/jpeg');

            try {
                const { data: { text } } = await Tesseract.recognize(
                    dataUrl,
                    'eng+hin',
                    { logger: m => console.log(m) }
                );

                console.log("OCR Result:", text);
                const parsed = parseIDText(text);
                onScanComplete(parsed);
            } catch (error) {
                console.error("OCR Error:", error);
                alert("Failed to read ID card. Please try again.");
            } finally {
                setIsProcessing(false);
            }
        }
    };

    const parseIDText = (text: string) => {
        // Basic heuristic parsing - can be improved with regex specific to Aadhar/Voter ID
        const lines = text.split('\n').filter(l => l.trim().length > 0);
        const result: any = {};

        // 1. Try to find ID Number (Aadhar is 12 digits, XXXX XXXX XXXX)
        // 1. Try to find ID Number (Aadhar is 12 digits, XXXX XXXX XXXX)
        const aadharRegex = /\b\d{4}\s\d{4}\s\d{4}\b/;

        const aadharMatch = text.match(aadharRegex);
        if (aadharMatch) result.idNumber = aadharMatch[0];

        // 2. Try to find Gender
        if (text.toLowerCase().includes('male') || text.includes('पुरुष')) result.gender = 'Male';
        if (text.toLowerCase().includes('female') || text.includes('महिला')) result.gender = 'Female';

        // 3. Try to find Date of Birth or Year to calculate Age
        const dobRegex = /\b\d{2}\/\d{2}\/\d{4}\b/;
        const yearRegex = /\b(19|20)\d{2}\b/;
        const dobMatch = text.match(dobRegex);

        if (dobMatch) {
            const year = parseInt(dobMatch[0].split('/')[2]);
            result.age = (new Date().getFullYear() - year).toString();
        } else {
            const yearMatch = text.match(yearRegex);
            if (yearMatch) {
                // Check if it's a likely birth year (e.g. < current year - 10)
                const year = parseInt(yearMatch[0]);
                if (year < new Date().getFullYear() - 10) {
                    result.age = (new Date().getFullYear() - year).toString();
                }
            }
        }

        // 4. Name is hardest. Usually the first line or near "Name" label.
        // For now, let's take the first line that looks like a name (only letters, > 3 chars).
        for (const line of lines) {
            if (/^[A-Za-z\s]+$/.test(line) && line.length > 3 && !line.toLowerCase().includes('govt') && !line.toLowerCase().includes('india')) {
                result.name = line;
                break;
            }
        }

        return result;
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50">
            <div className="bg-white p-4 rounded-xl max-w-lg w-full relative">
                <button onClick={onClose} className="absolute top-2 right-2 text-gray-500 hover:text-black">
                    <X className="w-6 h-6" />
                </button>

                <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                    <ScanLine className="w-6 h-6 text-blue-600" />
                    Scan ID Card
                </h3>

                <div className="relative bg-black rounded-lg overflow-hidden aspect-video mb-4">
                    <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
                    <canvas ref={canvasRef} className="hidden" />

                    {/* Guide Overlay */}
                    <div className="absolute inset-0 border-2 border-white/50 m-8 rounded-lg pointer-events-none flex items-center justify-center">
                        <p className="text-white/80 text-sm bg-black/50 px-2 py-1 rounded">Align ID Card Here</p>
                    </div>
                </div>

                <button
                    onClick={captureAndScan}
                    disabled={isProcessing}
                    className="w-full py-3 bg-blue-600 text-white rounded-lg font-semibold flex items-center justify-center gap-2 hover:bg-blue-700 disabled:bg-gray-400"
                >
                    {isProcessing ? (
                        <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            Processing...
                        </>
                    ) : (
                        <>
                            <Camera className="w-5 h-5" />
                            Capture & Scan
                        </>
                    )}
                </button>
            </div>
        </div>
    );
}
