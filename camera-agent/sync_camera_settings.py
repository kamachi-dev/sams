"""Pull deployed SAMS camera settings and apply them to the local camera config.ini."""
import configparser
from datetime import datetime
import os
import subprocess
import time
import urllib.error
import urllib.request

API_URL = os.environ.get('SAMS_API_URL', '').rstrip('/')
TOKEN = os.environ.get('CAMERA_AGENT_TOKEN', '')
CONFIG_PATH = os.environ.get('CAMERA_CONFIG_PATH', r'C:\SAMS-MMCL\Camera-Attendance-App\config.ini')
POLL_SECONDS = max(5, int(os.environ.get('CAMERA_SETTINGS_POLL_SECONDS', '10')))
LOG_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'camera-settings-agent.log')
RUNNER_PATH = os.environ.get('CAMERA_RUNNER_PATH', r'C:\SAMS-MMCL\Camera-Attendance-App\run_camera.bat')
camera_process = None


def log(message):
    line = f'{datetime.now().isoformat(timespec="seconds")} {message}'
    print(line)
    try:
        with open(LOG_PATH, 'a', encoding='utf-8') as log_file:
            log_file.write(f'{line}\n')
    except OSError:
        pass


def apply_settings(settings):
    parser = configparser.ConfigParser()
    parser.optionxform = str
    parser.read(CONFIG_PATH, encoding='utf-8')
    if not parser.has_section('Camera'):
        parser.add_section('Camera')
    parser['Camera']['room'] = settings['room']
    parser['Camera']['course_name'] = settings['courseName']
    parser['Camera']['section'] = settings['section']
    parser['Camera']['start_time'] = settings['startTime']
    parser['Camera']['end_time'] = settings['endTime']
    with open(CONFIG_PATH, 'w', encoding='utf-8', newline='') as config_file:
        parser.write(config_file)
    log(f"Config updated: {settings['room']}/{settings['courseName']}/{settings['section']} ({settings['startTime']}-{settings['endTime']})")


def load_command():
    request = urllib.request.Request(
        f'{API_URL}/api/camera/commands',
        headers={'X-Camera-Agent-Token': TOKEN},
    )
    with urllib.request.urlopen(request, timeout=15) as response:
        import json
        payload = json.load(response)
    if not payload.get('success'):
        raise RuntimeError(payload.get('error', 'Camera command request failed'))
    return payload['data']


def complete_command(command_id, succeeded, error=''):
    import json
    body = json.dumps({'id': command_id, 'succeeded': succeeded, 'error': error}).encode('utf-8')
    request = urllib.request.Request(
        f'{API_URL}/api/camera/commands',
        data=body,
        method='POST',
        headers={'X-Camera-Agent-Token': TOKEN, 'Content-Type': 'application/json'},
    )
    with urllib.request.urlopen(request, timeout=15) as response:
        if response.status != 200:
            raise RuntimeError(f'Camera command completion failed with HTTP {response.status}')


def load_settings_for(teacher_id=''):
    url = f'{API_URL}/api/camera/settings'
    if teacher_id:
        url += f'?teacher_id={teacher_id}'
    request = urllib.request.Request(
        url,
        headers={'X-Camera-Agent-Token': TOKEN},
    )
    with urllib.request.urlopen(request, timeout=15) as response:
        import json
        payload = json.load(response)
    if not payload.get('success'):
        raise RuntimeError(payload.get('error', 'Settings request failed'))
    return payload['data']

def execute_command(command):
    global camera_process
    action = command['action']
    requesting_teacher = (command.get('requested_by') or '').strip()
    if action == 'start':
        if camera_process and camera_process.poll() is None:
            return
        if requesting_teacher:
            log(f"Loading settings for teacher: {requesting_teacher}")
            settings = load_settings_for(requesting_teacher)
            apply_settings(settings)
        camera_process = subprocess.Popen(
            ['cmd.exe', '/d', '/s', '/c', RUNNER_PATH],
            cwd=os.path.dirname(RUNNER_PATH),
            creationflags=subprocess.CREATE_NEW_PROCESS_GROUP,
        )
        return
    if action == 'stop':
        stop_script = os.path.join(os.path.dirname(RUNNER_PATH), 'request_camera_stop.bat')
        subprocess.run(['cmd.exe', '/d', '/s', '/c', stop_script], check=True, timeout=90)
        camera_process = None
        return
    raise RuntimeError(f'Unsupported camera command: {action}')


def main():
    if not API_URL or not TOKEN:
        raise SystemExit('Set SAMS_API_URL and CAMERA_AGENT_TOKEN before starting the camera settings agent.')
    log(f'Camera settings agent running; syncing every {POLL_SECONDS} seconds.')
    while True:
        try:
            apply_settings(load_settings_for())
            command = load_command()
            if command:
                try:
                    execute_command(command)
                    complete_command(command['id'], True)
                    log(f"Camera command completed: {command['action']} (#{command['id']}).")
                except (OSError, subprocess.SubprocessError, RuntimeError) as error:
                    complete_command(command['id'], False, str(error))
                    log(f"Camera command failed: {command['action']} (#{command['id']}): {error}")
        except (OSError, ValueError, urllib.error.URLError, urllib.error.HTTPError, RuntimeError) as error:
            log(f'Camera settings sync failed: {error}')
        time.sleep(POLL_SECONDS)


if __name__ == '__main__':
    main()
