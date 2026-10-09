import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function CameraControls() {
  const [isRunning, setIsRunning] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [snapshotInProgress, setSnapshotInProgress] = useState(false);
  const [lastSnapshotTime, setLastSnapshotTime] = useState<Date | null>(null);
  const [snapshotInterval, setSnapshotInterval] = useState<number>(30); // Default 30 seconds
  const router = useRouter();

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
    setSnapshotInProgress(true);
    try {
      const res = await fetch('/api/teacher/camera-snapshot', {
        method: 'POST',
      });
      if (!res.ok) throw new Error('Failed to trigger snapshot');
      const data = await res.json();
      setLastSnapshotTime(new Date());
      // Show temporary success feedback
      setTimeout(() => {
        setSnapshotInProgress(false);
      }, 2000);
    } catch (error) {
      console.error('Error triggering snapshot:', error);
      setSnapshotInProgress(false);
    }
  };

  const handleStartCamera = async () => {
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
    }
  };

  const handleStopCamera = async () => {
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
    }
  };

  const handleIntervalChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10);
    if (!isNaN(value) && value >= 5 && value <= 300) {
      setSnapshotInterval(value);
    }
  };

  if (!isRunning && !isPending) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6 w-full max-w-xs">
        <h2 className="text-xl font-bold mb-4 text-center">Camera Controls</h2>
        <button
          onClick={handleStartCamera}
          disabled={isPending}
          className="w-full bg-green-600 text-white py-2 px-4 rounded hover:bg-green-700 transition-colors disabled:bg-green-400 disabled:cursor-not-allowed mb-2"
        >
          {isPending ? 'Starting...' : 'Start Camera'}
        </button>
        <button
          onClick={handleStopCamera}
          disabled={isPending || !isRunning}
          className="w-full bg-red-600 text-white py-2 px-4 rounded hover:bg-red-700 transition-colors disabled:bg-red-400 disabled:cursor-not-allowed"
        >
          {isPending ? 'Stopping...' : 'Stop Camera'}
        </button>
        
        {/* Snapshot Interval Controls */}
        <div className="mt-4 pt-4 border-t">
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
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6 w-full max-w-xs">
      <h2 className="text-xl font-bold mb-4 text-center">Camera Controls</h2>
      <div className="space-y-3">
        <button
          onClick={handleStartCamera}
          disabled={isPending}
          className="w-full bg-green-600 text-white py-2 px-4 rounded hover:bg-green-700 transition-colors disabled:bg-green-400 disabled:cursor-not-allowed"
        >
          {isPending ? 'Starting...' : 'Start Camera'}
        </button>
        <button
          onClick={handleStopCamera}
          disabled={isPending || !isRunning}
          className="w-full bg-red-600 text-white py-2 px-4 rounded hover:bg-red-700 transition-colors disabled:bg-red-400 disabled:cursor-not-allowed"
        >
          {isPending ? 'Stopping...' : 'Stop Camera'}
        </button>
        <button
          onClick={triggerSnapshot}
          disabled={isPending || snapshotInProgress || !isRunning}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 transition-colors disabled:bg-blue-400 disabled:cursor-not-allowed"
        >
          {snapshotInProgress ? 'Processing...' : 'Take Snapshot'}
        </button>
      </div>
      
      {/* Status Indicators */}
      <div className="mt-4 pt-3 border-t">
        {isPending && (
          <div className="text-yellow-600 text-sm flex items-center gap-2">
            <span>⏳</span>
            <span>Processing command...</span>
          </div>
        )}
        {!isPending && isRunning && (
          <div className="text-green-600 text-sm flex items-center gap-2">
            <span>📹</span>
            <span>Camera is running</span>
          </div>
        )}
        {!isPending && !isRunning && (
          <div className="text-gray-600 text-sm flex items-center gap-2">
            <span>⭕</span>
            <span>Camera is stopped</span>
          </div>
        )}
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
  );
}