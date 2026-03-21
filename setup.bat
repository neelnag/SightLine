@echo off
REM Quick start script for Voice Navigator (Windows)

echo.
echo 🎤 Voice Navigator - Quick Start
echo ==================================
echo.

REM Check if Node.js is installed
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Node.js not found. Please install from https://nodejs.org
    exit /b 1
)

echo ✓ Node.js found
for /f "tokens=*" %%i in ('node -v') do set NODE_VERSION=%%i
echo Version: %NODE_VERSION%
echo.

REM Install backend dependencies
echo 📦 Installing backend dependencies...
cd backend
call npm install

if %ERRORLEVEL% NEQ 0 (
    echo ❌ Failed to install backend dependencies
    exit /b 1
)

echo ✓ Backend dependencies installed
cd ..
echo.

REM Create icon directories
echo 🎨 Creating icon directory...
if not exist "extension\icons" mkdir extension\icons

echo ✓ Icon directory ready
echo.

echo ==================================
echo ✓ Setup Complete!
echo.
echo Next steps:
echo 1. Start the backend: cd backend ^&^& npm start
echo 2. Load extension in Chrome:
echo    - Go to chrome://extensions/
echo    - Enable 'Developer mode'
echo    - Click 'Load unpacked'
echo    - Select the 'extension' folder
echo 3. Add icon images to extension\icons\
echo    - icon16.png (16x16)
echo    - icon48.png (48x48)
echo    - icon128.png (128x128)
echo 4. Test by clicking the extension icon!
echo.
pause
