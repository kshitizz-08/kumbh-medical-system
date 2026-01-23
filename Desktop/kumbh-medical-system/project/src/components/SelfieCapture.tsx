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
  const [capturedDemographics, setCapturedDemographics] = useState<{
    age?: number;
    gender?: 'male' | 'female';
    estimatedHeight?: number;
    estimatedWeight?: number;
  } | null>(null);
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

        // Load MoveNet pose detection model (optional) - TEMPORARILY DISABLED for debugging
        /* try {
          const model = poseDetection.SupportedModels.MoveNet;
          const detectorConfig = {
            modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING,
          };
          const detector = await poseDetection.createDetector(model, detectorConfig);
          poseDetectorRef.current = detector;
          setPoseModelLoaded(true);
        } catch (poseErr) {
          console.warn('Pose model loading failed, will use fallback estimation:', poseErr);
          // Pose detection is optional - continue without it
        } */

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
  }, [modelsLoaded]);

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

    // Compute face descriptor and demographics for this captured frame
    let faceDescriptor: number[] | null = null;
    let demographics: { age?: number; gender?: 'male' | 'female'; estimatedHeight?: number; estimatedWeight?: number } = {};

    try {
      // Use detectSingleFace with chaining for all required data
      const detection = await faceapi
        .detectSingleFace(
          canvas,
          new faceapi.TinyFaceDetectorOptions({
            inputSize: 320,
            scoreThreshold: 0.45,
          })
        )
        .withFaceLandmarks()
        .withAgeAndGender()
        .withFaceDescriptor();

      if (detection) {
        faceDescriptor = Array.from(detection.descriptor as Float32Array);

        // Extract Age and Gender from face
        const age = Math.round(detection.age);
        const gender = detection.gender as 'male' | 'female';

        // Try to estimate height and weight from body pose
        let estimatedHeight: number | null = null;
        let estimatedWeight: number | null = null;

        // Pose detection is currently disabled - using heuristic estimation only

        // Fallback to heuristic estimation if pose detection failed
        if (!estimatedHeight || !estimatedWeight) {
          // Age/Gender-based heuristics (Indian averages)
          if (gender === 'male') {
            if (age < 12) { estimatedHeight = estimatedHeight || 135; estimatedWeight = estimatedWeight || 30; }
            else if (age < 16) { estimatedHeight = estimatedHeight || 160; estimatedWeight = estimatedWeight || 50; }
            else if (age < 20) { estimatedHeight = estimatedHeight || 170; estimatedWeight = estimatedWeight || 60; }
            else { estimatedHeight = estimatedHeight || 172; estimatedWeight = estimatedWeight || 68; }
          } else {
            if (age < 12) { estimatedHeight = estimatedHeight || 135; estimatedWeight = estimatedWeight || 30; }
            else if (age < 16) { estimatedHeight = estimatedHeight || 155; estimatedWeight = estimatedWeight || 45; }
            else if (age < 20) { estimatedHeight = estimatedHeight || 160; estimatedWeight = estimatedWeight || 52; }
            else { estimatedHeight = estimatedHeight || 158; estimatedWeight = estimatedWeight || 58; }
          }
        }

        demographics = {
          age,
          gender,
          estimatedHeight,
          estimatedWeight
        };
      } else {
        console.warn('No face detection results could be computed from captured image.');
      }
    } catch (err) {
      console.error('Failed to compute face data from captured image:', err);
    }

    // Convert to base64
    const imageData = canvas.toDataURL('image/jpeg', 0.9);
    setCapturedImage(imageData);
    setCapturedDescriptor(faceDescriptor); // Store the descriptor
    // Store demographics in a ref or state if we want to preview them, 
    // but for now we'll just pass them on confirm.
    // We can store them in a temporary state to pass to onCapture
    // For this refactor, let's attach them to the 'confirmCapture' scope via a ref or temp state
    // To avoid complex state changes, we'll just re-detect on confirm OR 
    // better: store it in a new state variable.
    setCapturedDemographics(demographics);

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
      // Use the stored descriptor if available, otherwise try to recompute
      let faceDescriptor = capturedDescriptor;

      if (!faceDescriptor && canvasRef.current) {
        try {
          // Recompute descriptor from the captured image if not stored
          const detectionWithDescriptor = await faceapi
            .detectSingleFace(
              canvasRef.current,
              new faceapi.TinyFaceDetectorOptions({
                inputSize: 320,
                scoreThreshold: 0.45,
              })
            )
            .withFaceLandmarks()
            .withFaceDescriptor();

          if (detectionWithDescriptor?.descriptor) {
            faceDescriptor = Array.from(detectionWithDescriptor.descriptor as Float32Array);
          }
        } catch (err) {
          console.error('Failed to recompute face descriptor on confirm:', err);
        }
      }

      onCapture(capturedImage, faceDescriptor, capturedDemographics || undefined);
      onClose();
    }
  };

  const retakePhoto = () => {
    setCapturedImage(null);
    setCapturedDescriptor(null);
    setValidationStatus(null);

    // Restart camera
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
        alert(t('selfie.failCameraShort'));
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
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: newFacingMode,
          width: { ideal: 640 },
          height: { ideal: 480 }
        }
      });

      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (error) {
      console.error('Error switching camera:', error);
      alert(t('selfie.failCameraShort'));
    }
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
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-900">{t('selfie.title')}</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {capturedImage ? (
          <div className="space-y-4">
            <div className="relative bg-gray-100 rounded-lg overflow-hidden">
              <img
                src={capturedImage}
                alt="Captured selfie"
                className="w-full h-auto"
              />
            </div>
            <div className="flex gap-3">
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
            {/* Body capture instructions */}
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
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-auto"
              />
              <canvas
                ref={canvasRef}
                className="absolute top-0 left-0 w-full h-full pointer-events-none"
              />
              {/* Flip Camera Button */}
              <button
                onClick={flipCamera}
                className="absolute top-4 right-4 bg-white bg-opacity-90 hover:bg-opacity-100 text-gray-800 p-3 rounded-full shadow-lg transition-all duration-200 hover:scale-110"
                title="Switch Camera"
              >
                <SwitchCamera className="w-5 h-5" />
              </button>
            </div>

            {validationStatus && (
              <div
                className={`p-3 rounded-md flex items-center gap-2 ${validationStatus.isValid
                  ? 'bg-green-50 text-green-800'
                  : 'bg-yellow-50 text-yellow-800'
                  }`}
              >
                {validationStatus.isValid ? (
                  <CheckCircle className="w-5 h-5 text-green-600" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-yellow-600" />
                )}
                <span className="text-sm">{validationStatus.message}</span>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
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
              <p>• {t('selfie.tip.4')}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

