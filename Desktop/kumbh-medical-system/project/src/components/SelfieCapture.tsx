import { useState, useRef, useEffect } from 'react';
import { Camera, X, CheckCircle, AlertCircle, Loader2, User } from 'lucide-react';
import * as faceapi from 'face-api.js';
import { loadPoseModel, getBodyEstimates, detectPose, isPoseComplete } from '../lib/poseEstimation';
import { useI18n } from '../i18n/i18n';

type FullBodyCaptureProps = {
  onCapture: (
    imageData: string,
    faceDescriptor: number[] | null,
    estimates: {
      age: number;
      gender: string;
      height: number;
      weight: number;
    } | null
  ) => void;
  onClose: () => void;
};

export default function FullBodyCapture({ onCapture, onClose }: FullBodyCaptureProps) {
  const { t } = useI18n();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState('Loading AI models...');
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [poseStatus, setPoseStatus] = useState<'none' | 'partial' | 'complete'>('none');
  const [poseFeedback, setPoseFeedback] = useState<string>('');

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      try {
        // Load face-api models
        setLoadingMsg(t('selfie.loadingModels'));
        const MODEL_URL = '/models';
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
          faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
          faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
          faceapi.nets.ageGenderNet.loadFromUri(MODEL_URL),
        ]);

        // Load pose detection model
        setLoadingMsg('Loading body analysis...');
        await loadPoseModel();

        if (!mounted) return;
        setModelsLoaded(true);

        // Start camera with portrait orientation
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: 'user',
            width: { ideal: 640 },
            height: { ideal: 960 }, // Taller for full body
          },
        });

        if (!mounted) {
          mediaStream.getTracks().forEach(track => track.stop());
          return;
        }

        setStream(mediaStream);
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }
      } catch (error) {
        console.error('Initialization error:', error);
        alert(t('selfie.failCamera'));
      }
    };

    init();

    return () => {
      mounted = false;
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [t]);

  // Real-time pose detection for feedback
  useEffect(() => {
    if (!modelsLoaded || !videoRef.current || capturedImage) return;

    const interval = setInterval(async () => {
      if (!videoRef.current) return;

      try {
        const poses = await detectPose(videoRef.current);
        if (poses.length === 0) {
          setPoseStatus('none');
          setPoseFeedback('No body detected');
        } else if (isPoseComplete(poses[0])) {
          setPoseStatus('complete');
          setPoseFeedback('✓ Ready to capture');
        } else {
          setPoseStatus('partial');
          setPoseFeedback('Move to show full body');
        }
      } catch (error) {
        console.error('Pose detection error:', error);
      }
    }, 500);

    return () => clearInterval(interval);
  }, [modelsLoaded, capturedImage]);

  const handleCapture = async () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');

    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const imageData = canvas.toDataURL('image/jpeg', 0.95);
    setCapturedImage(imageData);
  };

  const handleUsePhoto = async () => {
    if (!capturedImage || !canvasRef.current) return;

    setIsProcessing(true);

    try {
      const img = new Image();
      img.src = capturedImage;
      await new Promise((resolve) => {
        img.onload = resolve;
      });

      // 1. Get body estimates (height, weight)
      const bodyEstimates = await getBodyEstimates(img);

      if (!bodyEstimates) {
        alert('Could not analyze body pose. Please ensure full body is visible and try again.');
        setIsProcessing(false);
        return;
      }

      // 2. Get face detection for age/gender and descriptor
      const detection = await faceapi
        .detectSingleFace(img, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks()
        .withFaceDescriptor()
        .withAgeAndGender();

      let faceDescriptor: number[] | null = null;
      let age: number | null = null;
      let gender: string | null = null;

      if (detection) {
        faceDescriptor = Array.from(detection.descriptor);
        age = Math.round(detection.age);
        gender = detection.gender === 'male' ? 'Male' : detection.gender === 'female' ? 'Female' : 'Other';
      }

      // Combine estimates
      const estimates = {
        height: bodyEstimates.height,
        weight: bodyEstimates.weight,
        age: age || 30, // Fallback
        gender: gender || 'Other', // Fallback
      };

      onCapture(capturedImage, faceDescriptor, estimates);
    } catch (error) {
      console.error('Processing error:', error);
      alert('Failed to process image. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRetake = () => {
    setCapturedImage(null);
    setPoseStatus('none');
  };

  if (!modelsLoaded) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50">
        <div className="bg-white p-8 rounded-2xl max-w-md text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-lg font-semibold text-gray-900">{loadingMsg}</p>
          <p className="text-sm text-gray-500 mt-2">This may take a moment...</p>
        </div>
      </div>
    );
  }

  if (capturedImage) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-2xl font-bold text-gray-900">Review Photo</h3>
              <button onClick={onClose} className="text-gray-500 hover:text-black">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="relative bg-gray-900 rounded-xl overflow-hidden mb-6">
              <img src={capturedImage} alt="Captured" className="w-full h-auto" />
            </div>

            <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4 mb-6">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-900">
                  <p className="font-semibold mb-1">AI Estimates</p>
                  <p>Height, weight, age and gender will be estimated from this photo. These are approximations and may vary ±10-15% from actual values.</p>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleRetake}
                className="flex-1 py-3 px-6 bg-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-300 transition-colors flex items-center justify-center gap-2"
              >
                <Camera className="w-5 h-5" />
                {t('selfie.retake')}
              </button>
              <button
                onClick={handleUsePhoto}
                disabled={isProcessing}
                className="flex-1 py-3 px-6 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 disabled:bg-gray-400 transition-colors flex items-center justify-center gap-2"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-5 h-5" />
                    {t('selfie.usePhoto')}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-2xl font-bold text-gray-900">Take Full Body Photo</h3>
            <button onClick={onClose} className="text-gray-500 hover:text-black">
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="relative bg-black rounded-xl overflow-hidden mb-4" style={{ aspectRatio: '2/3' }}>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
            <canvas ref={canvasRef} className="hidden" />

            {/* Full-body silhouette overlay */}
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              <div className="relative w-2/3 h-5/6 flex items-center justify-center">
                {/* Body outline guide */}
                <div className={`absolute inset-0 border-4 rounded-full transition-colors ${poseStatus === 'complete' ? 'border-green-400' :
                    poseStatus === 'partial' ? 'border-yellow-400' :
                      'border-white/40'
                  }`} style={{ borderRadius: '45% 45% 50% 50%' }}>
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 border-4 rounded-full border-inherit"></div>
                </div>

                {/* Status indicator */}
                <div className={`absolute -top-8 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap ${poseStatus === 'complete' ? 'bg-green-500 text-white' :
                    poseStatus === 'partial' ? 'bg-yellow-500 text-black' :
                      'bg-white/80 text-black'
                  }`}>
                  {poseStatus === 'complete' && <CheckCircle className="w-4 h-4 inline mr-1" />}
                  {poseFeedback}
                </div>
              </div>
            </div>
          </div>

          {/* Instructions */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 mb-4">
            <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
              <User className="w-5 h-5 text-blue-600" />
              Instructions
            </h4>
            <ul className="text-sm text-gray-700 space-y-1">
              <li>• Stand 2-3 meters from camera</li>
              <li>• Ensure full body (head to feet) is visible</li>
              <li>• Stand on flat ground facing camera</li>
              <li>• Keep good lighting</li>
            </ul>
          </div>

          <button
            onClick={handleCapture}
            disabled={poseStatus !== 'complete'}
            className="w-full py-4 px-6 bg-blue-600 text-white rounded-xl font-bold text-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 shadow-lg"
          >
            <Camera className="w-6 h-6" />
            {t('selfie.capture')}
          </button>

          {poseStatus !== 'complete' && (
            <p className="text-center text-sm text-gray-500 mt-3">
              Wait for green checkmark to capture
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
