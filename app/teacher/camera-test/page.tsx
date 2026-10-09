import SnapshotMonitor from '@/app/components/camera/SnapshotMonitor';

export default function CameraTestPage() {
  return (
    <main className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Camera Snapshot Test</h1>
      <SnapshotMonitor />
    </main>
  );
}