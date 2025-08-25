#!/bin/bash


echo "=== CORS Preflight Test ==="
curl -i -X OPTIONS "https://crowd-lunch.fly.dev/menus/1" \
  -H "Origin: https://deploy-preview-62--cheery-dango-2fd190.netlify.app" \
  -H "Access-Control-Request-Method: PUT" \
  -H "Access-Control-Request-Headers: authorization,content-type"

echo -e "\n\n=== Server Time Test ==="
curl -i "https://crowd-lunch.fly.dev/server-time"

echo -e "\n\n=== Weekly Menus Test ==="
curl -i "https://crowd-lunch.fly.dev/weekly-menus?date=2025-08-25"

echo -e "\n\n=== Bearer Authentication Test (requires valid token) ==="
echo "# Replace \$TOKEN with actual Bearer token"
echo "curl -i -H \"Authorization: Bearer \$TOKEN\" \\"
echo "  -H \"Content-Type: application/json\" \\"
echo "  -X PUT \"https://crowd-lunch.fly.dev/menus/1\" \\"
echo "  -d '{\"cafe_time_available\":true}'"

echo -e "\n\n=== Diagnostic Info Test ==="
echo "Check browser console for:"
echo "=== API CLIENT DIAGNOSTIC INFO === {API_BASE_URL, RAW_API_BASE_URL, APP_COMMIT_SHA, APP_BUILD_TIME, ENVIRONMENT}"
