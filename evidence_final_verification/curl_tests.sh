#!/bin/bash

echo "=== Server Time Test (User Priority #1) ==="
curl -i "https://crowd-lunch.fly.dev/server-time" -H "Accept: application/json"

echo -e "\n\n=== CORS Preflight Test ==="
curl -i -X OPTIONS "https://crowd-lunch.fly.dev/menus/123" \
  -H "Origin: https://deploy-preview-62--cheery-dango-2fd190.netlify.app" \
  -H "Access-Control-Request-Method: PUT" \
  -H "Access-Control-Request-Headers: authorization,content-type"

echo -e "\n\n=== Bearer Authentication Test (requires valid token) ==="
echo "# Replace \$TOKEN with actual Bearer token"
echo "curl -i -X PUT \"https://crowd-lunch.fly.dev/menus/123\" \\"
echo "  -H \"Origin: https://deploy-preview-62--cheery-dango-2fd190.netlify.app\" \\"
echo "  -H \"Authorization: Bearer \$TOKEN\" \\"
echo "  -H \"Content-Type: application/json\" \\"
echo "  -H \"Accept: application/json\" \\"
echo "  -d '{\"cafe_time_available\":true}'"

echo -e "\n\n=== Weekly Menus Test ==="
curl -i "https://crowd-lunch.fly.dev/weekly-menus?date=2025-08-25"

echo -e "\n\n=== Health Check Test ==="
curl -i "https://crowd-lunch.fly.dev/healthz"

echo -e "\n\n=== Expected Headers Verification ==="
echo "Server-time should return:"
echo "- Status: 200 OK"
echo "- Content-Type: application/json"
echo "- Cache-Control: no-store, no-cache, must-revalidate"
echo ""
echo "CORS Preflight should return:"
echo "- Access-Control-Allow-Origin: https://deploy-preview-62--cheery-dango-2fd190.netlify.app"
echo "- Access-Control-Allow-Methods: GET,POST,PUT,DELETE,OPTIONS"
echo "- Access-Control-Allow-Headers: authorization,content-type"
echo "- Access-Control-Allow-Credentials: true"
echo "- Access-Control-Max-Age: 600"
echo "- Vary: Origin"

echo -e "\n\n=== Diagnostic Info Test ==="
echo "Check browser console for:"
echo "=== API CLIENT DIAGNOSTIC INFO === {API_BASE_URL, RAW_API_BASE_URL, APP_COMMIT_SHA, APP_BUILD_TIME, ENVIRONMENT}"
