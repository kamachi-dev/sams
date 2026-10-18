"use client";

import { useState, useEffect, useRef } from 'react';

export default function BrowserCamera({
  onSnapshotCapture,
  isRunning,
  snapshotInterval,
  deviceId
}: {
  onSnapshotCapture: (imageBlob: Blob) => Promise<{ success: boolean; data?: any; error?: string }>;
  isRunning: boolean;
  snapshotInterval: number;
  deviceId?: string;
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
  }, [isRunning, snapshotInterval, deviceId]);

  const initializeCamera = async () => {
    let stream: MediaStream | null = null;
    setError(null);
    try {
      const baseVideoConstraints: MediaTrackConstraints = {
        width: { ideal: 1280 },
        height: { ideal: 720 },
        frameRate: { ideal: 15 }
      };

      const videoConstraints: MediaTrackConstraints = deviceId
        ? { ...baseVideoConstraints, deviceId: { exact: deviceId } }
        : baseVideoConstraints;

      const constraints: MediaStreamConstraints = { video: videoConstraints };
      stream = await navigator.mediaDevices.getUserMedia(constraints);

      const video = videoRef.current;
      if (!video) throw new Error('Camera video element is unavailable');
      video.srcObject = stream;
      await video.play();
      setIsInitialized(true);

      startSnapshotTimer();
    } catch (err) {
      stream?.getTracks().forEach(track => track.stop());
      const detail = err instanceof Error ? err.message : String(err);
      setError(`Failed to start camera: ${detail}`);
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
          const video = videoRef.current;
          const sourceWidth = video?.videoWidth || 1280;
          const sourceHeight = video?.videoHeight || 720;
          const scale = Math.min(1, 1920 / sourceWidth, 1080 / sourceHeight);
          canvas.width = Math.round(sourceWidth * scale);
          canvas.height = Math.round(sourceHeight * scale);
          const ctx = canvas.getContext('2d');
          if (ctx && video) {
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
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
    if (videoRef.current?.srcObject && 'getTracks' in videoRef.current.srcObject) {
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
      const video = videoRef.current;
      const sourceWidth = video?.videoWidth || 1280;
      const sourceHeight = video?.videoHeight || 720;
      const scale = Math.min(1, 1920 / sourceWidth, 1080 / sourceHeight);
      canvas.width = Math.round(sourceWidth * scale);
      canvas.height = Math.round(sourceHeight * scale);
      const ctx = canvas.getContext('2d');
      if (ctx && video) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
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

  return (
    <div className="relative">
      <div className="aspect-w-16 aspect-h-9 bg-gray-100 rounded overflow-hidden">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          style={{ width: '100%', height: '100%', objectFit: 'cover', visibility: isInitialized ? 'visible' : 'hidden' }}
        />
        {!isInitialized && (
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <div className="text-center">
              <p className="text-sm text-gray-500">{isRunning ? 'Starting camera...' : 'Camera Off'}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}