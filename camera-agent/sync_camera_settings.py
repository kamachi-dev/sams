"""Pull deployed SAMS camera settings and apply them to the local camera config.ini."""
import configparser
from datetime import datetime
import os
import time
import urllib.error
import urllib.request

API_URL = os.environ.get('SAMS_API_URL', '').rstrip('/')
TOKEN = os.environ.get('CAMERA_AGENT_TOKEN', '')
CONFIG_PATH = os.environ.get('CAMERA_CONFIG_PATH', r'C:\SAMS-MMCL\Camera-Attendance-App\config.ini')
POLL_SECONDS = max(5, int(os.environ.get('CAMERA_SETTINGS_POLL_SECONDS', '10')))
LOG_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'camera-settings-agent.log')


def log(message):
    line = f'{datetime.now().isoformat(timespec="seconds")} {message}'
    print(line)
    try:
        with open(LOG_PATH, 'a', encoding='utf-8') as log_file:
            log_file.write(f'{line}\n')
    except OSError:
        pass


def load_settings():
    request = urllib.request.Request(
        f'{API_URL}/api/camera/settings',
        headers={'X-Camera-Agent-Token': TOKEN},
    )
    with urllib.request.urlopen(request, timeout=15) as response:
        import json
        payload = json.load(response)
    if not payload.get('success'):
        raise RuntimeError(payload.get('error', 'Settings request failed'))
    return payload['data']


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


def main():
    if not API_URL or not TOKEN:
        raise SystemExit('Set SAMS_API_URL and CAMERA_AGENT_TOKEN before starting the camera settings agent.')
    log(f'Camera settings agent running; syncing every {POLL_SECONDS} seconds.')
    while True:
        try:
            apply_settings(load_settings())
        except (OSError, ValueError, urllib.error.URLError, urllib.error.HTTPError, RuntimeError) as error:
            log(f'Camera settings sync failed: {error}')
        time.sleep(POLL_SECONDS)


if __name__ == '__main__':
    main()
