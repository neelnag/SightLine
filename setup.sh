#!/bin/bash
# Quick start script for Voice Navigator

echo "🎤 Voice Navigator - Quick Start"
echo "=================================="
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js not found. Please install Node.js from https://nodejs.org"
    exit 1
fi

echo "✓ Node.js found: $(node -v)"
echo ""

# Install backend dependencies
echo "📦 Installing backend dependencies..."
cd backend
npm install

if [ $? -eq 0 ]; then
    echo "✓ Backend dependencies installed"
else
    echo "❌ Failed to install backend dependencies"
    exit 1
fi

cd ..
echo ""

# Create placeholder icons
echo "🎨 Creating placeholder icons..."
mkdir -p extension/icons

# Create minimal PNG placeholders (1x1 transparent PNG in base64)
echo "Creating icon16.png..."
echo "iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAFf7IqVAAAADElEQVR42mNgGAWjYBQAAHHAA8u8TlCjAAAAAElFTkSuQmCC" | base64 -d > extension/icons/icon16.png 2>/dev/null || base64 -D <<< "iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAFf7IqVAAAADElEQVR42mNgGAWjYBQAAHHAA8u8TlCjAAAAAElFTkSuQmCC" > extension/icons/icon16.png

echo "Creating icon48.png..."
echo "iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAYAAABXAvmHAAAADElEQVR42mNgGAWjYBQAAHHAA8u8TlCjAAAAAElFTkSuQmCC" | base64 -d > extension/icons/icon48.png 2>/dev/null || base64 -D <<< "iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAYAAABXAvmHAAAADElEQVR42mNgGAWjYBQAAHHAA8u8TlCjAAAAAElFTkSuQmCC" > extension/icons/icon48.png

echo "Creating icon128.png..."
echo "iVBORw0KGgoAAAANSUhEUgAAAIAAAACACAYAAADTAoarAAAADElEQVR42mNgGAWjYBQAAHHAA8u8TlCjAAAAAElFTkSuQmCC" | base64 -d > extension/icons/icon128.png 2>/dev/null || base64 -D <<< "iVBORw0KGgoAAAANSUhEUgAAAIAAAACACAYAAADTAoarAAAADElEQVR42mNgGAWjYBQAAHHAA8u8TlCjAAAAAElFTkSuQmCC" > extension/icons/icon128.png

echo "✓ Placeholder icons created"
echo ""

echo "=================================="
echo "✓ Setup Complete!"
echo ""
echo "Next steps:"
echo "1. Start the backend: cd backend && npm start"
echo "2. Load extension in Chrome:"
echo "   - Go to chrome://extensions/"
echo "   - Enable 'Developer mode'"
echo "   - Click 'Load unpacked'"
echo "   - Select the 'extension' folder"
echo ""
echo "3. Test on any website by clicking the 🎤 icon!"
echo ""
