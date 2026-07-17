@echo off
cd /d "%~dp0"
echo ==============================================
echo SAMS Headless Camera Agent Bootstrap
echo ==============================================

if not exist "venv" (
    echo Creating Python virtual environment...
    python -m venv venv
    if errorlevel 1 (
        echo Failed to create virtual environment. Ensure python is installed and on PATH.
        pause
        exit /b 1
    )
)

echo Activating virtual environment...
call venv\Scripts\activate.bat

echo Checking/Installing dependencies...
pip install -r requirements.txt
if errorlevel 1 (
    echo Warning: Failed to install some dependencies. Attempting to run anyway...
)

echo Starting SAMS Camera Agent...
python camera_agent.py

pause
