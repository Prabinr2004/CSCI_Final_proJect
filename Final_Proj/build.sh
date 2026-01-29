#!/bin/bash
set -e

echo "🔧 Building Sports Fan Arena Backend..."
echo "Current directory: $(pwd)"
echo "Files in current directory:"
ls -la | head -20

echo ""
echo "Looking for requirements.txt..."
if [ -f "Final_Proj/requirements.txt" ]; then
    echo "Found at Final_Proj/requirements.txt"
    pip install --upgrade pip
    pip install -r Final_Proj/requirements.txt
elif [ -f "requirements.txt" ]; then
    echo "Found at requirements.txt"
    pip install --upgrade pip
    pip install -r requirements.txt
else
    echo "❌ ERROR: requirements.txt not found!"
    echo "Current directory: $(pwd)"
    find . -name "requirements.txt" -type f
    exit 1
fi

echo "✅ Build complete!"
