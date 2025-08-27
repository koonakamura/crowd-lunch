#!/bin/bash


set -e

API_BASE_URL="https://crowd-lunch.fly.dev"
ADMIN_EMAIL="admin@example.com"

echo "🚀 Starting test menu data generation..."

echo "📝 Using direct admin authentication for seeding..."
ACCESS_TOKEN="admin-seed-token"
echo "✅ Authentication configured"

declare -a TEST_MENUS=(
  '{"serve_date":"2025-07-28","title":"月曜日テストメニュー","price":600,"max_qty":20}'
  '{"serve_date":"2025-07-29","title":"火曜日テストメニュー","price":650,"max_qty":25}'
  '{"serve_date":"2025-07-30","title":"水曜日テストメニュー","price":700,"max_qty":30}'
  '{"serve_date":"2025-07-31","title":"木曜日テストメニュー","price":750,"max_qty":15}'
  '{"serve_date":"2025-08-01","title":"金曜日テストメニュー","price":800,"max_qty":35}'
  '{"serve_date":"2025-08-02","title":"土曜日テストメニュー","price":550,"max_qty":10}'
  '{"serve_date":"2025-08-03","title":"日曜日テストメニュー","price":500,"max_qty":12}'
)

echo "📅 Creating test menus for the week..."

for menu_data in "${TEST_MENUS[@]}"; do
  date=$(echo "$menu_data" | jq -r '.serve_date')
  name=$(echo "$menu_data" | jq -r '.title')
  
  echo "  Creating menu for $date: $name"
  
  response=$(curl -s -X POST "${API_BASE_URL}/menus" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $ACCESS_TOKEN" \
    -d "$menu_data")
  
  if [ $? -eq 0 ]; then
    menu_id=$(echo "$response" | jq -r '.id // empty')
    if [ -n "$menu_id" ]; then
      echo "    ✅ Created menu ID: $menu_id"
    else
      echo "    ⚠️  Menu created but no ID returned:"
      echo "    $response"
    fi
  else
    echo "    ❌ Failed to create menu for $date"
    echo "    Response: $response"
  fi
done

echo ""
echo "🔍 Verifying created menus..."

for menu_data in "${TEST_MENUS[@]}"; do
  date=$(echo "$menu_data" | jq -r '.serve_date')
  
  echo "  Checking menu for $date..."
  response=$(curl -s -H "Authorization: Bearer $ACCESS_TOKEN" \
    "${API_BASE_URL}/menus?date=$date")
  
  if [ $? -eq 0 ]; then
    menu_count=$(echo "$response" | jq '. | length')
    if [ "$menu_count" -gt 0 ]; then
      echo "    ✅ Found $menu_count menu(s)"
    else
      echo "    ❌ No menus found for $date"
    fi
  else
    echo "    ❌ Failed to fetch menu for $date"
  fi
done

echo ""
echo "📊 Testing weekly menus API..."
weekly_response=$(curl -s "${API_BASE_URL}/menus/weekly")

if [ $? -eq 0 ]; then
  weekly_count=$(echo "$weekly_response" | jq '. | length')
  echo "✅ Weekly API returned $weekly_count date groups"
  
  echo "$weekly_response" | jq -r '.[] | "  📅 \(.date): \(.menus | length) menu(s)"'
else
  echo "❌ Failed to fetch weekly menus"
fi

echo ""
echo "🎉 Test data generation completed!"
echo ""
echo "💡 Usage tips:"
echo "  - Check admin interface: ${API_BASE_URL}/admin"
echo "  - Check homepage: https://cheery-dango-2fd190.netlify.app/"
echo "  - API endpoints:"
echo "    - Weekly: ${API_BASE_URL}/menus/weekly"
echo "    - By date: ${API_BASE_URL}/menus?date=YYYY-MM-DD"
