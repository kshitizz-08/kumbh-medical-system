import { useState, useRef, useEffect } from 'react';
import { Camera, X, CheckCircle, AlertCircle, Loader2, Info, SwitchCamera } from 'lucide-react';
import * as faceapi from 'face-api.js';
import { useI18n } from '../i18n/i18n';

type SelfieCaptureProps = {
  // faceDescriptor is used for face-based search / identification
  onCapture: (
    imageData: string,
    faceDescriptor: number[] | null,
    demographics?: {
      age?: number;
      gender?: 'male' | 'female';
      estimatedHeight?: number;
      estimatedWeight?: number;
    }
  ) => void;
  onClose: () => void;
};

export default function SelfieCapture({ onCapture, onClose }: SelfieCaptureProps) {
  const { t } = useI18n();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [validationStatus, setValidationStatus] = useState<{
    isValid: boolean;
    message: string;
  } | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [capturedDescriptor, setCapturedDescriptor] = useState<number[] | null>(null);

  // Refactor demographics to be fully editable state
  const [editableDemographics, setEditableDemographics] = useState<{
    age: string;
    gender: 'male' | 'female';
    estimatedHeight: string;
    estimatedWeight: string;
  }>({
    age: '',
    gender: 'male',
    estimatedHeight: '',
    estimatedWeight: ''
  });

  const detectionIntervalRef = useRef<number | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');


  // Load face-api.js models and TensorFlow pose detection
  useEffect(() => {
    const loadModels = async () => {
      try {
        // Load Face-API models from CDN
        const sources = [
          'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model/',
          'https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/',
        ];

        let faceModelsLoaded = false;
        for (const url of sources) {
          try {
            await Promise.all([
              faceapi.nets.tinyFaceDetector.loadFromUri(url),
              faceapi.nets.faceLandmark68Net.loadFromUri(url),
              faceapi.nets.faceRecognitionNet.loadFromUri(url),
              faceapi.nets.ageGenderNet.loadFromUri(url),
            ]);
            faceModelsLoaded = true;
            setModelsLoaded(true);
            break;
          } catch (err) {
            console.warn(`Failed to load face models from ${url}`, err);
          }
        }

        // Check if face models loaded successfully
        if (!faceModelsLoaded) {
          throw new Error('Failed to load face detection models from all sources');
        }

        setIsLoading(false);
      } catch (err) {
        console.error('Failed to load models:', err);
        setIsLoading(false);
        alert(t('selfie.failModels'));
      }
    };

    loadModels();
  }, []);

  // Start camera stream
  useEffect(() => {
    if (!modelsLoaded) return;

    const startCamera = async () => {
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: facingMode, // Use state variable for camera selection
            width: { ideal: 640 },
            height: { ideal: 480 }
          }
        });

        setStream(mediaStream);
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }
      } catch (error) {
        console.error('Error accessing camera:', error);
        alert(t('selfie.failCamera'));
        setIsLoading(false);
      }
    };

    startCamera();

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      if (detectionIntervalRef.current) {
        clearInterval(detectionIntervalRef.current);
      }
    };
  }, [modelsLoaded, facingMode]); // Added facingMode dependency

  // Real-time face detection
  useEffect(() => {
    if (!modelsLoaded || !stream || !videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    if (!ctx) return;

    const detectFaces = async () => {
      if (video.readyState === video.HAVE_ENOUGH_DATA) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        const detections = await faceapi
          .detectAllFaces(
            video,
            new faceapi.TinyFaceDetectorOptions({
              inputSize: 320, // smaller = faster, good enough for validation
              scoreThreshold: 0.45,
            })
          )
          .withFaceLandmarks();

        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        // Draw face detection boxes
        detections.forEach((detection) => {
          const box = detection.detection.box;
          ctx.strokeStyle = '#00ff00';
          ctx.lineWidth = 2;
          ctx.strokeRect(box.x, box.y, box.width, box.height);
        });

        // Validate: Check if exactly one face is detected
        if (detections.length === 0) {
          setValidationStatus({
            isValid: false,
            message: t('selfie.noFace'),
          });
        } else if (detections.length > 1) {
          setValidationStatus({
            isValid: false,
            message: t('selfie.multiFace'),
          });
        } else {
          // Check if mouth is closed (not talking)
          const landmarks = detections[0].landmarks;
          const mouth = landmarks?.getMouth?.();

          if (!mouth || mouth.length < 10) {
            setValidationStatus({
              isValid: true,
              message: t('selfie.landmarksOk'),
            });
            return;
          }

          // Calculate mouth opening distance
          const topLip = mouth[3]; // Top center of mouth
          const bottomLip = mouth[9]; // Bottom center of mouth
          const mouthOpening = Math.abs(topLip.y - bottomLip.y);

          // Calculate face size for relative mouth opening
          const faceBox = detections[0].detection.box;
          const faceHeight = faceBox.height || 1;
          const relativeMouthOpening = mouthOpening / faceHeight;

          // Threshold: consider closed if mouth opening < 6% of face height
          if (relativeMouthOpening < 0.06) {
            setValidationStatus({
              isValid: true,
              message: t('selfie.ready'),
            });
          } else {
            setValidationStatus({
              isValid: false,
              message: t('selfie.mouthOpen'),
            });
          }
        }
      }
    };

    // Run detection every 200ms
    detectionIntervalRef.current = window.setInterval(detectFaces, 200);

    return () => {
      if (detectionIntervalRef.current) {
        clearInterval(detectionIntervalRef.current);
      }
    };
  }, [modelsLoaded, stream]);

  const capturePhoto = async () => {
    if (!videoRef.current || !canvasRef.current) {
      return;
    }

    setIsCapturing(true);
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      setIsCapturing(false);
      return;
    }

    // Set canvas size to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw current video frame to canvas
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Compute face descriptor
    let faceDescriptor: number[] | null = null;

    // We initialize with defaults, but we will wait for API to overwrite them
    let initialDemographics = {
      age: '25',
      gender: 'male' as 'male' | 'female',
      estimatedHeight: '170',
      estimatedWeight: '65'
    };

    try {
      const detection = await faceapi
        .detectSingleFace(
          canvas,
          new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.45 })
        )
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (detection) {
        faceDescriptor = Array.from(detection.descriptor as Float32Array);
      }
    } catch (err) {
      console.error('Failed to compute face descriptor:', err);
    }

    // Convert to base64
    const imageData = canvas.toDataURL('image/jpeg', 0.9);
    setCapturedImage(imageData);
    setCapturedDescriptor(faceDescriptor);

    // Initial optimistic UI update (shows "Analyzing..." or defaults?)
    // Let's set defaults first so UI is usable immediately
    setEditableDemographics(initialDemographics);

    // Call Backend Gemini API
    try {
      const response = await fetch('/api/face/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: imageData }),
      });

      if (response.ok) {
        const apiData = await response.json();
        console.log('Gemini Analysis:', apiData);

        if (apiData) {
          setEditableDemographics({
            age: apiData.age?.toString() || initialDemographics.age,
            gender: (apiData.gender?.toLowerCase() === 'female' ? 'female' : 'male'),
            estimatedHeight: apiData.estimatedHeight?.toString() || initialDemographics.estimatedHeight,
            estimatedWeight: apiData.estimatedWeight?.toString() || initialDemographics.estimatedWeight
          });
        }
      }
    } catch (apiErr) {
      console.warn('Face API failed:', apiErr);
    }

    // Stop camera stream
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
    if (detectionIntervalRef.current) {
      clearInterval(detectionIntervalRef.current);
    }

    setIsCapturing(false);
  };

  const confirmCapture = async () => {
    if (capturedImage) {
      // Pass the EDITED values to the callback
      onCapture(capturedImage, capturedDescriptor, {
        age: parseInt(editableDemographics.age) || 25,
        gender: editableDemographics.gender,
        estimatedHeight: parseInt(editableDemographics.estimatedHeight) || 170,
        estimatedWeight: parseInt(editableDemographics.estimatedWeight) || 65
      });
      onClose();
    }
  };

  const retakePhoto = () => {
    setCapturedImage(null);
    setCapturedDescriptor(null);
    setValidationStatus(null);

    // Restart logic is handled by the effect or we restart manually.
    // Since we unmount/remount logic isn't clean here, let's just nullify image and ensuring stream logic triggers?
    // Actually our stream effect depends on [modelsLoaded, facingMode]. It doesn't check capturedImage.
    // But we stopped the stream in capturePhoto. So we need to restart it.
    // The easiest way is to call the startCamera logic again.

    const startCamera = async () => {
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: facingMode,
            width: { ideal: 640 },
            height: { ideal: 480 }
          }
        });
        setStream(mediaStream);
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }
      } catch (error) {
        console.error('Error accessing camera:', error);
      }
    };
    startCamera();
  };

  const flipCamera = async () => {
    // Stop current stream
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }

    // Toggle facing mode
    const newFacingMode = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(newFacingMode);

    // Restart camera with new facing mode
    // (The useEffect will pick this up if we added facingMode as dependency, which I did in this full rewrite)
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
        <div className="bg-white p-6 rounded-lg text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-700">{t('selfie.loadingModels')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 overflow-y-auto">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 my-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-900">{t('selfie.title')}</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="w-6 h-6" />
          </button>
        </div>

        {capturedImage ? (
          <div className="space-y-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative bg-gray-100 rounded-lg overflow-hidden flex-1">
                <img src={capturedImage} alt="Captured selfie" className="w-full h-auto object-cover" />
              </div>

              {/* Manual Edit Form */}
              <div className="flex-1 bg-blue-50 p-4 rounded-lg space-y-3">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                  <Info className="w-4 h-4 text-blue-600" />
                  AI Estimate (Adjust if needed)
                </h3>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Age (Years)</label>
                    <input
                      type="number"
                      value={editableDemographics.age}
                      onChange={(e) => setEditableDemographics({ ...editableDemographics, age: e.target.value })}
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Gender</label>
                    <select
                      value={editableDemographics.gender}
                      onChange={(e) => setEditableDemographics({ ...editableDemographics, gender: e.target.value as 'male' | 'female' })}
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Height (cm)</label>
                    <input
                      type="number"
                      value={editableDemographics.estimatedHeight}
                      onChange={(e) => setEditableDemographics({ ...editableDemographics, estimatedHeight: e.target.value })}
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Weight (kg)</label>
                    <input
                      type="number"
                      value={editableDemographics.estimatedWeight}
                      onChange={(e) => setEditableDemographics({ ...editableDemographics, estimatedWeight: e.target.value })}
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Verify these details carefully. They will be used for medical checks.
                </p>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={retakePhoto}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                {t('selfie.retake')}
              </button>
              <button
                onClick={confirmCapture}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center justify-center gap-2"
              >
                <CheckCircle className="w-5 h-5" />
                {t('selfie.usePhoto')}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* ... (Camera view remains mostly the same, just keeping the JSX structure) */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-800">
                  <strong>{t('selfie.bodyTip') || 'For accurate height/weight detection'}</strong>
                  <p className="text-xs mt-0.5">{t('selfie.bodyInstructions') || 'Step back to show your full body from head to toe'}</p>
                </div>
              </div>
            </div>

            <div className="relative bg-gray-900 rounded-lg overflow-hidden">
              <video ref={videoRef} autoPlay playsInline muted className="w-full h-auto" />
              <canvas ref={canvasRef} className="absolute top-0 left-0 w-full h-full pointer-events-none" />
              <button
                onClick={flipCamera}
                className="absolute top-4 right-4 bg-white bg-opacity-90 hover:bg-opacity-100 text-gray-800 p-3 rounded-full shadow-lg transition-all duration-200 hover:scale-110"
                title="Switch Camera"
              >
                <SwitchCamera className="w-5 h-5" />
              </button>
            </div>

            {validationStatus && (
              <div className={`p-3 rounded-md flex items-center gap-2 ${validationStatus.isValid ? 'bg-green-50 text-green-800' : 'bg-yellow-50 text-yellow-800'}`}>
                {validationStatus.isValid ? <CheckCircle className="w-5 h-5 text-green-600" /> : <AlertCircle className="w-5 h-5 text-yellow-600" />}
                <span className="text-sm">{validationStatus.message}</span>
              </div>
            )}

            <div className="flex gap-3">
              <button onClick={onClose} className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50">
                {t('selfie.cancel')}
              </button>
              <button
                onClick={capturePhoto}
                disabled={isCapturing}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isCapturing ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    {t('selfie.capturing')}
                  </>
                ) : (
                  <>
                    <Camera className="w-5 h-5" />
                    {t('selfie.capture')}
                  </>
                )}
              </button>
            </div>

            <div className="text-xs text-gray-500 space-y-1">
              <p>• {t('selfie.tip.1')}</p>
              <p>• {t('selfie.tip.2')}</p>
              <p>• {t('selfie.tip.3')}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
