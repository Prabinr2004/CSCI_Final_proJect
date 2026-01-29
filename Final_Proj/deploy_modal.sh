#!/bin/bash

# Sports Fan Arena - Modal Deployment Script

set -e  # Exit on error

echo "🚀 Sports Fan Arena - Modal Deployment Setup"
echo "=============================================="
echo ""

# Check if Modal CLI is installed
if ! command -v modal &> /dev/null; then
    echo "❌ Modal CLI not found. Installing..."
    pip install modal
else
    echo "✅ Modal CLI found"
fi

# Check if user is authenticated
if [ ! -f ~/.modal/token_id.txt ]; then
    echo "❌ Modal authentication needed"
    echo "Running: modal token new"
    modal token new
else
    echo "✅ Modal authenticated"
fi

# Check .env file
if [ ! -f .env ]; then
    echo "⚠️  .env file not found. Creating template..."
    cat > .env << 'EOF'
OPENROUTER_API_KEY=your_key_here
DATABASE_PATH=./backend/data/fan_engagement.db
EOF
    echo "📝 Please update .env with your OPENROUTER_API_KEY"
    echo "Then run this script again"
    exit 1
else
    echo "✅ .env file exists"
fi

# Verify requirements.txt
if [ ! -f requirements.txt ]; then
    echo "❌ requirements.txt not found"
    exit 1
else
    echo "✅ requirements.txt exists"
fi

# Verify modal_app.py
if [ ! -f modal_app.py ]; then
    echo "❌ modal_app.py not found"
    exit 1
else
    echo "✅ modal_app.py exists"
fi

echo ""
echo "🎯 Ready to deploy!"
echo ""
echo "Options:"
echo "1. Deploy to production: modal deploy modal_app.py"
echo "2. Test locally: modal run modal_app.py"
echo "3. View logs: modal tail sports-fan-arena"
echo ""
echo "📚 Full guide: cat MODAL_DEPLOYMENT.md"
