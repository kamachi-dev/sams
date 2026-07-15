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

Set `CAMERA_SETTINGS_POLL_SECONDS` to change the 30-second interval. Keep the
command window open, or configure the batch file in Windows Task Scheduler to
start at sign-in.
