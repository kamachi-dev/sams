# Camera-System Integration Test Plan

## Overview
This document outlines the steps to test the integrated camera system with the website for automatic timed snapshots.

## Components Modified
1. **Website Components**:
   - `CameraControls.tsx` - UI for controlling camera and setting snapshot intervals
   - `CameraPreview.tsx` - Placeholder for camera preview
   - Updated `camera-settings.ts` service to include snapshot interval
   - Updated camera configuration API to handle snapshot interval
   - Teacher portal camera page

2. **Camera Agent** (`camera_agent.py`):
   - Added automatic snapshot functionality based on configurable interval
   - Added performance optimizations for low-end devices
   - Improved error handling and logging

3. **Database Schema**:
   - Added `snapshot_interval` column to `camera_settings` and `teacher_camera_settings` tables
   - Expanded `camera_command` action to include 'snapshot'

## Test Procedure

### 1. Database Setup
```bash
# Apply the updated migration
psql -U postgres -d sams -f migrations/002_camera_settings.sql
```

### 2. Environment Configuration
Set these environment variables for the camera agent:
```bash
export SAMS_API_URL="http://localhost:3000"
export CAMERA_AGENT_TOKEN="your_secure_token_here"
export TEACHER_ID="teacher_id_from_database"
export SNAPSHOT_INTERVAL_SECONDS="30"  # Optional, defaults to 30
export CAMERA_SETTINGS_POLL_SECONDS="3"
```

### 3. Start Services
```bash
# Start the Next.js website
cd /Users/Windows 11/Documents/GitHub/sams
npm run dev

# In another terminal, start the camera agent
cd /Users/Windows 11/Documents/GitHub/sams/camera-agent
python camera_agent.py
```

### 4. Test Manual Controls
1. Navigate to `/teacher-portal/camera` in the website
2. Click "Start Camera" - should show camera as running
3. Set snapshot interval to 10 seconds for testing
4. Click "Take Snapshot" - should trigger immediate snapshot
5. Wait 10 seconds - should see automatic snapshot occur
6. Click "Stop Camera" - should stop camera and disable automatic snapshots

### 5. Verify Functionality
Check the camera agent logs for:
- "Loaded Settings for teacher..." when camera starts
- "Taking automatic snapshot (interval: Xs)" when automatic snapshots occur
- "Snapshot saved to: ..." when images are captured
- "Running face recognition on snapshot..." when processing begins
- "Sending Y recognized student(s) to SAMS..." when attendance is sent

### 6. Performance Verification
For low-end device testing:
1. Monitor CPU usage during operation
2. Verify that frames are being processed at expected intervals
3. Check that memory usage remains stable
4. Test with different snapshot intervals (5s, 30s, 60s) to observe performance impact

## Expected Results
- Camera starts/stops correctly via website UI
- Manual snapshots work on demand
- Automatic snapshots occur at configured intervals
- Images are captured, processed, and attendance records sent
- System remains responsive on low-end devices
- No memory leaks or excessive CPU usage

## Troubleshooting
If snapshots aren't occurring:
1. Check camera agent logs for errors
2. Verify API endpoints are accessible
3. Confirm database has correct snapshot interval values
4. Ensure camera agent has proper permissions to access webcam
5. Verify environment variables are set correctly