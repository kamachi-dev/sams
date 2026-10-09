import { useState, useEffect, useRef } from 'react';

export default function BrowserCamera({
  onSnapshotCapture,
  isRunning,
  snapshotInterval
}: {
  onSnapshotCapture: (imageBlob: Blob) => Promise<{ success: boolean; data?: any; error?: string }>;
  isRunning: boolean;
  snapshotInterval: number;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const snapshotRef = useRef<NodeJS.Timeout | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (!isRunning) {
      cleanup();
      return;
    }

    initializeCamera();
    
    return () => {
      cleanup();
    };
  }, [isRunning, snapshotInterval]);

  const initializeCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          width: { ideal: 640 },
          height: { ideal: 480 },
          frameRate: { ideal: 15 } // Lower FPS for performance on low-end devices
        }
      });
      
      videoRef.current!.srcObject = stream;
      videoRef.current!.play();
      setIsInitialized(true);
      
      // Start periodic snapshots
      startSnapshotTimer();
    } catch (err) {
      setError('Failed to access camera. Please check permissions and ensure no other application is using the webcam.');
      console.error('Camera access error:', err);
    }
  };

  const startSnapshotTimer = () => {
    if (snapshotRef.current) clearTimeout(snapshotRef.current);
    
    // Don't start timer if not running or already processing
    if (!isRunning || isProcessing) return;
    
    snapshotRef.current = setTimeout(async () => {
      if (videoRef.current && videoRef.current.srcObject && isRunning && !isProcessing) {
        try {
          setIsProcessing(true);
          
          // Capture frame from video
          const canvas = document.createElement('canvas');
          canvas.width = 640;
          canvas.height = 480;
          const ctx = canvas.getContext('2d');
          if (ctx && videoRef.current) {
            ctx.drawImage(videoRef.current, 0, 0, 640, 480);
            canvas.toBlob(async (blob) => {
              if (blob) {
                const result = await onSnapshotCapture(blob);
                // Handle result if needed (could show success/error UI)
              }
              // Restart timer for next snapshot
              setIsProcessing(false);
              startSnapshotTimer();
            }, 'image/jpeg', 0.8); // Good quality, reasonable size
          } else {
            setIsProcessing(false);
            startSnapshotTimer();
          }
        } catch (captureErr) {
          console.error('Snapshot capture error:', captureErr);
          setIsProcessing(false);
          startSnapshotTimer(); // Try again after interval
        }
      } else {
        setIsProcessing(false);
        startSnapshotTimer();
      }
    }, snapshotInterval * 1000);
  };

  const cleanup = () => {
    if (snapshotRef.current) clearTimeout(snapshotRef.current);
    if (videoRef.current?.srcObject) {
      const tracks = videoRef.current.srcObject.getTracks();
      tracks.forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsInitialized(false);
    setIsProcessing(false);
  };

  // Manual snapshot function for UI button
  const takeManualSnapshot = async () => {
    if (!isRunning || isProcessing || !videoRef.current?.srcObject) return false;
    
    setIsProcessing(true);
    try {
      // Capture frame from video
      const canvas = document.createElement('canvas');
      canvas.width = 640;
      canvas.height = 480;
      const ctx = canvas.getContext('2d');
      if (ctx && videoRef.current) {
        ctx.drawImage(videoRef.current, 0, 0, 640, 480);
        return new Promise<Blob | null>((resolve) => {
          canvas.toBlob((blob) => {
            resolve(blob);
          }, 'image/jpeg', 0.8);
        });
      }
      return null;
    } finally {
      setIsProcessing(false);
    }
  };

  if (error) {
    return <div className="p-4 bg-red-50 border-l-4 border-red-400 text-red-700 text-sm">{error}</div>;
  }

  if (!isInitialized) {
    return (
      <div className="aspect-w-16 aspect-h-9 bg-gray-200 flex items-center justify-center p-4">
        <div className="text-center">
          <span className="material-icons-outline text-gray-400 mb-2 block">videocam_off</span>
          <p className="text-sm text-gray-500">Camera Off</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Video Feed */}
      <div className="aspect-w-16 aspect-h-9 bg-gray-100 rounded overflow-hidden">
        <video 
          ref={videoRef} 
          autoPlay 
          playsInline 
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
        {!isRunning && (
          <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center pointer-events-none">
            <span className="material-icons-outline text-white text-5xl">videocam</span>
          </div>
        )}
        {isProcessing && (
          <div className="absolute inset-0 bg-blue-500 bg-opacity-25 flex items-center justify-center pointer-events-none">
            <div className="text-white text-sm">
              <span className="material-icons-outline">hourglass_empty</span>
              <span className="ml-1">Processing...</span>
            </div>
          </div>
        )}
      </div>
      
      {/* Controls Overlay - Optional */}
      {/* 
      <div className="absolute bottom-4 left-4 right-4 flex justify-between items-center">
        <button 
          onClick={takeManualSnapshot}
          disabled={!isRunning || isProcessing}
          className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed"
        >
          {isProcessing ? 'Processing...' : 'Snapshot'}
        </button>
      </div>
      */}
    </div>
  );
}