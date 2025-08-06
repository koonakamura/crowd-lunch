#!/bin/bash
# Script to deploy image files to production Fly.io backend.
# This script uploads the churrasco and pizza images to the production server.

set -e

echo "🚀 Deploying images to production Fly.io backend..."

if ! command -v flyctl &> /dev/null; then
    echo "❌ flyctl is not installed. Installing..."
    curl -L https://fly.io/install.sh | sh
    export PATH="$HOME/.fly/bin:$PATH"
fi

if ! flyctl auth whoami &> /dev/null; then
    echo "❌ Not authenticated with Fly.io. Please run 'flyctl auth login' first"
    exit 1
fi

APP_NAME="crowd-lunch"

echo "📁 Creating uploads directory on production server..."
flyctl ssh console -a $APP_NAME -C "mkdir -p /app/uploads"

echo "📤 Uploading churrasco image for 8/6..."
flyctl ssh console -a $APP_NAME -C "cat > /app/uploads/AdobeStock_792531420_Preview_churrasco.jpeg" < api/uploads/AdobeStock_792531420_Preview_churrasco.jpeg

echo "📤 Uploading pizza image for 8/7..."
flyctl ssh console -a $APP_NAME -C "cat > /app/uploads/AdobeStock_387834369_Preview_pizza.jpeg" < api/uploads/AdobeStock_387834369_Preview_pizza.jpeg

echo "🔍 Verifying uploaded files..."
flyctl ssh console -a $APP_NAME -C "ls -la /app/uploads/"

echo "✅ Images successfully deployed to production!"
echo ""
echo "🔗 Test image URLs:"
echo "   https://crowd-lunch.fly.dev/uploads/AdobeStock_792531420_Preview_churrasco.jpeg"
echo "   https://crowd-lunch.fly.dev/uploads/AdobeStock_387834369_Preview_pizza.jpeg"
