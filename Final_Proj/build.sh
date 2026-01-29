#!/bin/bash
set -e

echo "🔧 Building Sports Fan Arena Backend..."
echo "Current directory: $(pwd)"
echo "Files in current directory:"
ls -la | head -20

echo ""
echo "Installing dependencies..."
pip install --upgrade pip
pip install -r requirements.txt

echo "✅ Build complete!"
