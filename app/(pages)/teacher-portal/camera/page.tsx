import CameraControls from '@/app/components/camera/CameraControls';
import BrowserCamera from '@/app/components/camera/BrowserCamera';
import { useState, useEffect } from 'react';

export default function CameraPage() {
  const [isRunning, setIsRunning] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [snapshotInterval, setSnapshotInterval] = useState<number>(30); // Default 30 seconds
  const [lastSnapshotTime, setLastSnapshotTime] = useState<Date | null>(null);
  const [attendanceStatus, setAttendanceStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Fetch camera status on mount and periodically
  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await fetch('/api/teacher/camera-control');
        if (!res.ok) throw new Error('Failed to fetch camera status');
        const data = await res.json();
        setIsRunning(data.data?.running ?? false);
        setIsPending(data.data?.pending ?? false);
      } catch (error) {
        console.error('Error fetching camera status:', error);
      }
    };

    fetchStatus();
    const interval = setInterval(fetchStatus, 5000); // Poll every 5 seconds
    return () => clearInterval(interval);
  }, []);

  // Handle automatic snapshots when camera is running
  useEffect(() => {
    let snapshotTimer: NodeJS.Timeout | null = null;

    if (isRunning && !isPending && snapshotInterval > 0) {
      // Clear any existing timer
      if (snapshotTimer) clearTimeout(snapshotTimer);

      // Set new timer for next snapshot
      snapshotTimer = setTimeout(async () => {
        if (isRunning && !isPending) {
          await triggerSnapshot();
        }
      }, snapshotInterval * 1000);
    }

    // Cleanup timer on unmount or when dependencies change
    return () => {
      if (snapshotTimer) clearTimeout(snapshotTimer);
    };
  }, [isRunning, isPending, snapshotInterval]);

  const triggerSnapshot = async () => {
    setAttendanceStatus('Taking snapshot...');
    setError(null);
    try {
      const videoBlob = await takeSnapshotFromVideo();
      if (!videoBlob) {
        setAttendanceStatus('Failed to capture snapshot');
        return;
      }

      // Prepare form data
      const formData = new FormData();
      formData.append('image', videoBlob, 'snapshot.jpg');
      formData.append('courseId', 'COURSE_PLACEholder'); // TODO: Get from settings
      formData.append('sectionId', 'SECTION_PLACEHOLDER'); // TODO: Get from settings
      formData.append('timestamp', new Date().toISOString());

      const res = await fetch('/api/camera/snapshot', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to process snapshot');
      }

      const result = await res.json();
      if (result.success) {
        setAttendanceStatus(`Snapshot processed: ${result.data?.records?.length || 0} student(s) detected`);
        setLastSnapshotTime(new Date());
      } else {
        setAttendanceStatus('Failed to process snapshot');
        setError(result.error || 'Unknown error');
      }
    } catch (err) {
      console.error('Error processing snapshot:', error);
      setAttendanceStatus('Error processing snapshot');
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  };

  const takeSnapshotFromVideo = async (): Promise<Blob | null> => {
    // This would require accessing the video element from BrowserCamera
    // For simplicity, we'll have BrowserCamera call a callback when it captures a frame
    // We'll implement this differently - BrowserCamera will take the snapshot and send it directly
    return null; // Placeholder - we'll change the approach
  };

  const handleStartCamera = async () => {
    setError(null);
    try {
      const res = await fetch('/api/teacher/camera-control', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'start' }),
      });
      if (!res.ok) throw new Error('Failed to start camera');
      const data = await res.json();
      setIsRunning(data.data?.running ?? false);
      setIsPending(data.data?.pending ?? false);
    } catch (error) {
      console.error('Error starting camera:', error);
      setError('Failed to start camera');
    }
  };

  const handleStopCamera = async () => {
    setError(null);
    try {
      const res = await fetch('/api/teacher/camera-control', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'stop' }),
      });
      if (!res.ok) throw new Error('Failed to stop camera');
      const data = await res.json();
      setIsRunning(data.data?.running ?? false);
      setIsPending(data.data?.pending ?? false);
    } catch (error) {
      console.error('Error stopping camera:', error);
      setError('Failed to stop camera');
    }
  };

  const handleIntervalChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10);
    if (!isNaN(value) && value >= 5 && value <= 300) {
      setSnapshotInterval(value);
    }
  };

  // We'll change the approach: BrowserCamera will handle snapshot capture and sending
  // So we need to pass a callback to BrowserCamera that sends to our API

  const handleBrowserSnapshot = async (imageBlob: Blob): Promise<{ success: boolean; data?: any; error?: string }> => {
    setAttendanceStatus('Processing snapshot...');
    try {
      // Prepare form data
      const formData = new FormData();
      formData.append('image', imageBlob, 'snapshot.jpg');
      // TODO: Get actual courseId and sectionId from settings
      formData.append('courseId', 'COURSE_PLACEHOLDER');
      formData.append('sectionId', 'SECTION_PLACEHOLDER');
      formData.append('timestamp', new Date().toISOString());

      const res = await fetch('/api/camera/snapshot', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const errorData = await res.json();
        return { success: false, error: errorData.error || 'Failed to process snapshot' };
      }

      const result = await res.json();
      if (result.success) {
        setLastSnapshotTime(new Date());
        return { 
          success: true, 
          data: { 
            records: result.data?.records || [],
            message: `Detected ${result.data?.records?.length || 0} student(s)` 
          } 
        };
      } else {
        return { success: false, error: result.error || 'Unknown error' };
      }
    } catch (err) {
      console.error('Error in handleBrowserSnapshot:', err);
      return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <header className="mb-8">
          <h1 className="text-2xl font-bold text-gray-800">Camera Attendance System</h1>
          <p className="text-gray-600 mt-2">
            Monitor and control the camera system for automated attendance tracking
          </p>
        </header>
        
        {/* Status Alerts */}
        {error && (
          <div className="mb-4 bg-red-50 border-l-4 border-red-400 text-red-700 p-4">
            <p className="text-sm">{error}</p>
          </div>
        )}
        
        {attendanceStatus && (
          <div className="mb-4 bg-blue-50 border-l-4 border-blue-400 text-blue-700 p-4">
            <p className="text-sm">{attendanceStatus}</p>
          </div>
        )}
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Controls and Camera Feed */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="mb-4">
                <h2 className="text-xl font-bold mb-2">Camera Controls</h2>
                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={handleStartCamera}
                    disabled={isPending}
                    className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors disabled:bg-green-400 disabled:cursor-not-allowed"
                  >
                    {isPending ? 'Starting...' : 'Start Camera'}
                  </button>
                  <button
                    onClick={handleStopCamera}
                    disabled={isPending || !isRunning}
                    className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors disabled:bg-red-400 disabled:cursor-not-allowed"
                  >
                    {isPending ? 'Stopping...' : 'Stop Camera'}
                  </button>
                  <button
                    onClick={triggerSnapshot}
                    disabled={isPending || !isRunning}
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors disabled:bg-blue-400 disabled:cursor-not-allowed"
                  >
                    Take Manual Snapshot
                  </button>
                </div>
                
                {/* Snapshot Interval Controls */}
                <div className="mt-4 pt-3 border-t">
                  <h3 className="font-semibold mb-2">Automatic Snapshots</h3>
                  <div className="flex items-center gap-2">
                    <label className="text-sm">Interval (seconds):</label>
                    <input
                      type="number"
                      value={snapshotInterval}
                      onChange={handleIntervalChange}
                      min="5"
                      max="300"
                      className="w-20 text-center border rounded px-2"
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Set how often automatic snapshots are taken when camera is running
                  </p>
                </div>
                
                {lastSnapshotTime && (
                  <div className="mt-3 pt-3 border-t">
                    <p className="text-sm text-gray-600">
                      Last snapshot: {lastSnapshotTime.toLocaleTimeString()}
                    </p>
                  </div>
                )}
              </div>
              
              {/* Camera Feed */}
              <div className="mt-6">
                <BrowserCamera 
                  onSnapshotCapture={handleBrowserSnapshot}
                  isRunning={isRunning}
                  snapshotInterval={snapshotInterval}
                />
              </div>
            </div>
          </div>
          
          {/* Information Panel */}
          <div className="lg:col-span-1 space-y-4">
            <div className="bg-white rounded-lg shadow-md p-5">
              <h3 className="font-semibold text-lg mb-3">How It Works</h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                The camera system uses your browser's webcam to capture snapshots at regular intervals 
                and sends them to the attendance recognition pipeline. Teachers can 
                manually trigger snapshots or set automatic intervals.
              </p>
            </div>
            
            <div className="bg-white rounded-lg shadow-md p-5">
              <h3 className="font-semibold text-lg mb-3">Performance Tips</h3>
              <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                <li>Lower snapshot intervals increase processing load</li>
                <li>Recommended interval: 30-60 seconds for most classes</li>
                <li>Ensure good lighting for better face recognition</li>
                <li>Keep the camera lens clean for clear images</li>
              </ul>
            </div>
            
            <div className="bg-white rounded-lg shadow-md p-5">
              <h3 className="font-semibold text-lg mb-3">Privacy Notice</h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                Camera data is processed locally and only attendance records 
                (student IDs and timestamps) are stored. No images are retained 
                after processing.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}