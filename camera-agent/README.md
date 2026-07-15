# Camera settings agent

Run this on the Windows computer connected to the attendance camera. It retrieves
the settings saved in the deployed SAMS app and writes them to the local
`config.ini` every 30 seconds.

Before starting `run_camera_settings_agent.bat`, set these user environment variables:

```text
SAMS_API_URL=https://your-deployed-sams-domain
CAMERA_AGENT_TOKEN=the-same-long-random-value-configured-on-the-deployed-app
CAMERA_CONFIG_PATH=C:\SAMS-MMCL\Camera-Attendance-App\config.ini
```

Set `CAMERA_SETTINGS_POLL_SECONDS` to change the 30-second interval. To run the
agent in the background, configure `run_camera_settings_agent.vbs` in Windows
Task Scheduler to start at sign-in. The `.vbs` launcher hides the command window;
errors are recorded in `camera-settings-agent.log` in this folder.

The agent also receives Start and Stop requests from the deployed Teacher Portal.
`CAMERA_RUNNER_PATH` defaults to `C:\SAMS-MMCL\Camera-Attendance-App\run_camera.bat`.
Stopping requires `request_camera_stop.bat` beside that runner script.
