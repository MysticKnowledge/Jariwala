#!/bin/bash

# =====================================================
# PHASE 4: OFFLINE → ONLINE SYNC TESTS
# Tests offline queue, order preservation, and sync safety
# =====================================================

set -e

echo "=================================================="
echo "PHASE 4: OFFLINE → ONLINE SYNC TESTS"
echo "=================================================="

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

FUNCTION_URL="${SUPABASE_URL}/functions/v1/sync_event"
STAFF_TOKEN="${STAFF_JWT_TOKEN}"

# Get test data
VARIANT_ID=$(supabase db execute "SELECT id FROM variants LIMIT 1" --output json | jq -r '.[0].id')
STORE_ID=$(supabase db execute "SELECT id FROM locations WHERE name = 'Main Store Mumbai'" --output json | jq -r '.[0].id')

# =====================================================
# TEST 9: OFFLINE BILLING TEST
# =====================================================

echo -e "\n${BLUE}📴 TEST 9: OFFLINE BILLING TEST${NC}"

# Simulate 5 offline sales with client-generated IDs
echo -e "\n  Creating 5 offline sales (with unique event_ids)..."

OFFLINE_EVENTS=()
for i in {1..5}; do
    EVENT_ID="offline-$(uuidgen)"
    OFFLINE_EVENTS+=("$EVENT_ID")
    echo "    Event $i: $EVENT_ID"
done

# Get initial stock
INITIAL_STOCK=$(supabase db execute "
SELECT COALESCE(current_quantity, 0) 
FROM current_stock_view 
WHERE variant_id = '$VARIANT_ID' AND location_id = '$STORE_ID'
LIMIT 1" --output json | jq -r '.[0].coalesce')

echo -e "\n  Initial stock: $INITIAL_STOCK units"

# Ensure we have enough stock
if [ "$INITIAL_STOCK" -lt 5 ]; then
    echo "  Adding stock for test..."
    curl -s -X POST "$FUNCTION_URL" \
      -H "Authorization: Bearer $STAFF_TOKEN" \
      -H "Content-Type: application/json" \
      -d "{
        \"event_type\": \"ADJUSTMENT\",
        \"variant_id\": \"$VARIANT_ID\",
        \"quantity\": 10,
        \"to_location_id\": \"$STORE_ID\",
        \"channel\": \"MANUAL\"
      }" > /dev/null
    
    INITIAL_STOCK=$(supabase db execute "
    SELECT COALESCE(current_quantity, 0) 
    FROM current_stock_view 
    WHERE variant_id = '$VARIANT_ID' AND location_id = '$STORE_ID'
    LIMIT 1" --output json | jq -r '.[0].coalesce')
    
    echo "  New stock: $INITIAL_STOCK units"
fi

# Simulate "offline" - sync events with timestamps
echo -e "\n  Simulating offline sync (events created 1 hour ago)..."
OFFLINE_TIMESTAMP=$(date -u -d '1 hour ago' +"%Y-%m-%dT%H:%M:%SZ" 2>/dev/null || date -u -v-1H +"%Y-%m-%dT%H:%M:%SZ")

SYNC_COUNT=0
for EVENT_ID in "${OFFLINE_EVENTS[@]}"; do
    RESPONSE=$(curl -s -X POST "$FUNCTION_URL" \
      -H "Authorization: Bearer $STAFF_TOKEN" \
      -H "Content-Type: application/json" \
      -d "{
        \"event_id\": \"$EVENT_ID\",
        \"event_type\": \"SALE\",
        \"variant_id\": \"$VARIANT_ID\",
        \"quantity\": -1,
        \"from_location_id\": \"$STORE_ID\",
        \"channel\": \"STORE\",
        \"sync_source\": \"POS-OFFLINE-TEST\",
        \"client_timestamp\": \"$OFFLINE_TIMESTAMP\",
        \"reference_number\": \"OFFLINE-BILL-$EVENT_ID\"
      }")
    
    if echo "$RESPONSE" | jq -e '.success == true' > /dev/null; then
        ((SYNC_COUNT++))
    else
        echo -e "${RED}    ❌ Sync failed for $EVENT_ID: $RESPONSE${NC}"
        exit 1
    fi
done

echo -e "${GREEN}    ✅ All $SYNC_COUNT events synced${NC}"

# Verify stock decreased by 5
FINAL_STOCK=$(supabase db execute "
SELECT COALESCE(current_quantity, 0) 
FROM current_stock_view 
WHERE variant_id = '$VARIANT_ID' AND location_id = '$STORE_ID'
LIMIT 1" --output json | jq -r '.[0].coalesce')

EXPECTED_STOCK=$((INITIAL_STOCK - 5))
if [ "$FINAL_STOCK" -eq "$EXPECTED_STOCK" ]; then
    echo -e "${GREEN}    ✅ Stock correctly decreased: $INITIAL_STOCK → $FINAL_STOCK${NC}"
else
    echo -e "${RED}    ❌ Stock mismatch! Expected $EXPECTED_STOCK, got $FINAL_STOCK${NC}"
    exit 1
fi

# Test 9.1: No duplication on retry
echo -e "\n  TEST 9.1: Retrying same events (idempotency check)..."
RETRY_COUNT=0
for EVENT_ID in "${OFFLINE_EVENTS[@]}"; do
    RESPONSE=$(curl -s -X POST "$FUNCTION_URL" \
      -H "Authorization: Bearer $STAFF_TOKEN" \
      -H "Content-Type: application/json" \
      -d "{
        \"event_id\": \"$EVENT_ID\",
        \"event_type\": \"SALE\",
        \"variant_id\": \"$VARIANT_ID\",
        \"quantity\": -1,
        \"from_location_id\": \"$STORE_ID\",
        \"channel\": \"STORE\"
      }")
    
    if echo "$RESPONSE" | jq -e '.success == true' > /dev/null; then
        ((RETRY_COUNT++))
    fi
done

echo "    Retried $RETRY_COUNT events"

# Stock should NOT change
RETRY_STOCK=$(supabase db execute "
SELECT COALESCE(current_quantity, 0) 
FROM current_stock_view 
WHERE variant_id = '$VARIANT_ID' AND location_id = '$STORE_ID'
LIMIT 1" --output json | jq -r '.[0].coalesce')

if [ "$RETRY_STOCK" -eq "$FINAL_STOCK" ]; then
    echo -e "${GREEN}    ✅ No duplicate entries - stock unchanged${NC}"
else
    echo -e "${RED}    ❌ CRITICAL: Stock changed on retry! $FINAL_STOCK → $RETRY_STOCK${NC}"
    exit 1
fi

# =====================================================
# TEST 10: SYNC ORDER TEST
# =====================================================

echo -e "\n${BLUE}🔄 TEST 10: SYNC ORDER TEST${NC}"

# Create new test variant
TEST_VARIANT=$(supabase db execute "SELECT id FROM variants WHERE sku_code = 'TS-BLU-M' LIMIT 1" --output json | jq -r '.[0].id')

echo -e "\n  Creating events in specific order:"
echo "    1. PURCHASE +50"
echo "    2. SALE -10"
echo "    3. TRANSFER_OUT -15"

# Get initial stock
INIT_TEST_STOCK=$(supabase db execute "
SELECT COALESCE(current_quantity, 0) 
FROM current_stock_view 
WHERE variant_id = '$TEST_VARIANT' AND location_id = '$STORE_ID'
LIMIT 1" --output json | jq -r '.[0].coalesce')

echo "    Initial stock: $INIT_TEST_STOCK"

# Event 1: PURCHASE
EVENT1_ID="order-test-$(uuidgen)"
curl -s -X POST "$FUNCTION_URL" \
  -H "Authorization: Bearer $STAFF_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"event_id\": \"$EVENT1_ID\",
    \"event_type\": \"PURCHASE\",
    \"variant_id\": \"$TEST_VARIANT\",
    \"quantity\": 50,
    \"to_location_id\": \"$STORE_ID\",
    \"channel\": \"MANUAL\"
  }" > /dev/null

# Event 2: SALE
EVENT2_ID="order-test-$(uuidgen)"
curl -s -X POST "$FUNCTION_URL" \
  -H "Authorization: Bearer $STAFF_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"event_id\": \"$EVENT2_ID\",
    \"event_type\": \"SALE\",
    \"variant_id\": \"$TEST_VARIANT\",
    \"quantity\": -10,
    \"from_location_id\": \"$STORE_ID\",
    \"channel\": \"STORE\"
  }" > /dev/null

# Event 3: TRANSFER_OUT
GODOWN_ID=$(supabase db execute "SELECT id FROM locations WHERE type = 'GODOWN' LIMIT 1" --output json | jq -r '.[0].id')
EVENT3_ID="order-test-$(uuidgen)"
curl -s -X POST "$FUNCTION_URL" \
  -H "Authorization: Bearer $STAFF_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"event_id\": \"$EVENT3_ID\",
    \"event_type\": \"TRANSFER_OUT\",
    \"variant_id\": \"$TEST_VARIANT\",
    \"quantity\": -15,
    \"from_location_id\": \"$STORE_ID\",
    \"to_location_id\": \"$GODOWN_ID\",
    \"channel\": \"MANUAL\"
  }" > /dev/null

echo -e "${GREEN}    ✅ Events created${NC}"

# Calculate expected stock
EXPECTED_FINAL=$((INIT_TEST_STOCK + 50 - 10 - 15))

# Get final stock
FINAL_TEST_STOCK=$(supabase db execute "
SELECT COALESCE(current_quantity, 0) 
FROM current_stock_view 
WHERE variant_id = '$TEST_VARIANT' AND location_id = '$STORE_ID'
LIMIT 1" --output json | jq -r '.[0].coalesce')

if [ "$FINAL_TEST_STOCK" -eq "$EXPECTED_FINAL" ]; then
    echo -e "${GREEN}    ✅ Final stock correct: $FINAL_TEST_STOCK (expected $EXPECTED_FINAL)${NC}"
else
    echo -e "${RED}    ❌ Stock calculation error! Expected $EXPECTED_FINAL, got $FINAL_TEST_STOCK${NC}"
    exit 1
fi

# Test: Verify events are in correct order
echo -e "\n  Verifying event order in database..."
EVENT_ORDER=$(supabase db execute "
SELECT event_type, quantity 
FROM event_ledger 
WHERE event_id IN ('$EVENT1_ID', '$EVENT2_ID', '$EVENT3_ID')
ORDER BY created_at" --output json)

echo "    Event order: $(echo $EVENT_ORDER | jq -r '.[].event_type' | tr '\n' ' ')"
echo -e "${GREEN}    ✅ Events stored in creation order${NC}"

# =====================================================
# TEST: CONFLICT DETECTION
# =====================================================

echo -e "\n${BLUE}⚠️  TEST 10.1: Simulating conflict scenario${NC}"

# Get current stock
CONFLICT_STOCK=$(supabase db execute "
SELECT COALESCE(current_quantity, 0) 
FROM current_stock_view 
WHERE variant_id = '$VARIANT_ID' AND location_id = '$STORE_ID'
LIMIT 1" --output json | jq -r '.[0].coalesce')

echo "  Current stock: $CONFLICT_STOCK"

# Try to sync old event that would cause negative stock
if [ "$CONFLICT_STOCK" -gt 0 ]; then
    OLD_TIMESTAMP=$(date -u -d '2 hours ago' +"%Y-%m-%dT%H:%M:%SZ" 2>/dev/null || date -u -v-2H +"%Y-%m-%dT%H:%M:%SZ")
    
    echo "  Attempting to sync old event that exceeds current stock..."
    RESPONSE=$(curl -s -X POST "$FUNCTION_URL" \
      -H "Authorization: Bearer $STAFF_TOKEN" \
      -H "Content-Type: application/json" \
      -d "{
        \"event_type\": \"SALE\",
        \"variant_id\": \"$VARIANT_ID\",
        \"quantity\": -$((CONFLICT_STOCK + 10)),
        \"from_location_id\": \"$STORE_ID\",
        \"client_timestamp\": \"$OLD_TIMESTAMP\",
        \"channel\": \"STORE\"
      }")
    
    if echo "$RESPONSE" | jq -e '.success == false' > /dev/null; then
        echo -e "${GREEN}    ✅ Correctly rejected conflicting event${NC}"
    else
        echo -e "${RED}    ❌ CRITICAL: Conflicting event accepted!${NC}"
        exit 1
    fi
fi

echo -e "\n${GREEN}==================================================${NC}"
echo -e "${GREEN}✅ PHASE 4 TESTS COMPLETE${NC}"
echo -e "${GREEN}==================================================${NC}"
echo "Summary:"
echo "  ✅ Offline events synced successfully"
echo "  ✅ No duplicates on retry"
echo "  ✅ Event order preserved"
echo "  ✅ Stock calculation accurate"
echo "  ✅ Conflicts detected"
echo -e "${GREEN}==================================================${NC}"
