import React, { useRef, useEffect, useState, useCallback } from 'react';

interface LiveCameraProps {
  onCaptureComplete: (capturedFrames: string[]) => void;
  onError: (error: string) => void;
  isActive: boolean;
}

const LiveCamera: React.FC<LiveCameraProps> = ({ onCaptureComplete, onError, isActive }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  
  const [isReady, setIsReady] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [status, setStatus] = useState('Initializing camera...');

  const startCamera = useCallback(async () => {
    try {
      setStatus('Requesting camera access...');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user'
        },
        audio: false
      });

      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          setIsReady(true);
          setStatus('Camera ready! Position your face in the frame and click capture.');
        };
        videoRef.current.play();
      }
    } catch (err) {
      console.error('Error accessing camera:', err);
      onError('Unable to access camera. Please check permissions and try again.');
      setStatus('Camera access denied');
    }
  }, [onError]);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsReady(false);
  }, []);

  const capturePhoto = useCallback((): string | null => {
    if (!videoRef.current || !canvasRef.current || !isReady) return null;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    if (!ctx) return null;

    // Set canvas size to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Capture current frame
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Convert to base64 JPEG
    return canvas.toDataURL('image/jpeg', 0.8);
  }, [isReady]);

  const handleCaptureClick = useCallback(() => {
    if (!isReady || isCapturing) return;

    setIsCapturing(true);
    setCountdown(3);
    setStatus('Get ready! Photo will be taken in...');
  }, [isReady, isCapturing]);

  const takeFinalPhoto = useCallback(() => {
    const photo = capturePhoto();
    if (photo) {
      setStatus('Photo captured! Sending for verification...');
      onCaptureComplete([photo]); // Send as array with single photo
      setIsCapturing(false);
    } else {
      setStatus('Failed to capture photo. Please try again.');
      setIsCapturing(false);
    }
  }, [capturePhoto, onCaptureComplete]);

  // Countdown effect
  useEffect(() => {
    if (countdown > 0 && isCapturing) {
      const timer = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (countdown === 0 && isCapturing) {
      takeFinalPhoto();
    }
  }, [countdown, isCapturing, takeFinalPhoto]);

  // Initialize camera when component becomes active
  useEffect(() => {
    if (isActive) {
      startCamera();
    } else {
      stopCamera();
    }

    return () => stopCamera();
  }, [isActive, startCamera, stopCamera]);

  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* Video Feed */}
      <div className="relative bg-gray-900 rounded-lg overflow-hidden mb-6">
        <video
          ref={videoRef}
          className="w-full h-80 object-cover"
          autoPlay
          muted
          playsInline
        />
        
        {/* Countdown Overlay */}
        {isCapturing && countdown > 0 && (
          <div className="absolute inset-0 bg-black bg-opacity-60 flex items-center justify-center">
            <div className="text-center text-white">
              <div className="text-6xl font-bold text-teal-400 mb-2">
                {countdown}
              </div>
              <p className="text-lg">Hold still!</p>
            </div>
          </div>
        )}

        {/* Face Guide */}
        <div className="absolute inset-8 border-4 border-teal-400 rounded-full opacity-40 pointer-events-none"></div>
        
        {/* Status Indicator */}
        <div className="absolute top-4 right-4 text-white text-xs bg-black bg-opacity-60 p-2 rounded">
          {isReady ? '🟢 READY' : '🔴 STARTING...'}
        </div>
      </div>

      {/* Hidden Canvas for Photo Capture */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Status Display */}
      <div className="mb-6 p-4 bg-gray-100 rounded-lg text-center border-l-4 border-teal-500">
        <p className="text-sm text-gray-700 font-medium">{status}</p>
        {isReady && !isCapturing && (
          <div className="mt-2 text-xs text-gray-600">
            📸 Position your face within the circle and click capture when ready
          </div>
        )}
      </div>

      {/* Capture Button */}
      <div className="text-center">
        <button
          onClick={handleCaptureClick}
          disabled={!isReady || isCapturing}
          className={`px-8 py-3 rounded-lg font-semibold text-white transition-all duration-300 ${
            !isReady || isCapturing
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-teal-600 hover:bg-teal-700 hover:scale-105 shadow-lg'
          }`}
        >
          {isCapturing 
            ? `Capturing in ${countdown}...` 
            : isReady 
            ? '📸 Capture Live Photo' 
            : 'Starting Camera...'}
        </button>
        
        {isReady && !isCapturing && (
          <p className="text-xs text-gray-500 mt-2">
            This photo will be compared with your Aadhaar photo
          </p>
        )}
      </div>
    </div>
  );
};

export default LiveCamera;