#!/bin/bash

# =====================================================
# PHASE 3: EDGE FUNCTION TESTS
# Tests sync_event validation and error handling
# =====================================================

set -e

echo "=================================================="
echo "PHASE 3: EDGE FUNCTION TESTS"
echo "=================================================="

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
FUNCTION_URL="${SUPABASE_URL}/functions/v1/sync_event"
OWNER_TOKEN="${OWNER_JWT_TOKEN}"
STAFF_TOKEN="${STAFF_JWT_TOKEN}"
ACCOUNTANT_TOKEN="${ACCOUNTANT_JWT_TOKEN}"

# Get test IDs from database
echo "Getting test data IDs..."
VARIANT_ID=$(supabase db execute "SELECT id FROM variants LIMIT 1" --output json | jq -r '.[0].id')
STORE_ID=$(supabase db execute "SELECT id FROM locations WHERE name = 'Main Store Mumbai'" --output json | jq -r '.[0].id')
GODOWN_ID=$(supabase db execute "SELECT id FROM locations WHERE name = 'Warehouse Central'" --output json | jq -r '.[0].id')

echo "  Variant ID: $VARIANT_ID"
echo "  Store ID: $STORE_ID"
echo "  Godown ID: $GODOWN_ID"

# =====================================================
# TEST 6: EVENT VALIDATION TEST
# =====================================================

echo -e "\n${BLUE}⚙️ TEST 6: EVENT VALIDATION TEST${NC}"

# Test 6.1: Valid SALE event (MUST SUCCEED)
echo -e "\n  TEST 6.1: Valid SALE event..."
RESPONSE=$(curl -s -X POST "$FUNCTION_URL" \
  -H "Authorization: Bearer $STAFF_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"event_type\": \"SALE\",
    \"variant_id\": \"$VARIANT_ID\",
    \"quantity\": -1,
    \"from_location_id\": \"$STORE_ID\",
    \"channel\": \"STORE\",
    \"reference_number\": \"TEST-VALID-001\"
  }")

if echo "$RESPONSE" | jq -e '.success == true' > /dev/null; then
    echo -e "${GREEN}    ✅ Valid event accepted${NC}"
else
    echo -e "${RED}    ❌ Valid event rejected: $RESPONSE${NC}"
    exit 1
fi

# Test 6.2: Missing event_type (MUST FAIL)
echo -e "\n  TEST 6.2: Missing event_type..."
RESPONSE=$(curl -s -X POST "$FUNCTION_URL" \
  -H "Authorization: Bearer $STAFF_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"variant_id\": \"$VARIANT_ID\",
    \"quantity\": -1,
    \"from_location_id\": \"$STORE_ID\"
  }")

if echo "$RESPONSE" | jq -e '.success == false' > /dev/null; then
    echo -e "${GREEN}    ✅ Correctly rejected missing event_type${NC}"
else
    echo -e "${RED}    ❌ CRITICAL: Accepted invalid event${NC}"
    exit 1
fi

# Test 6.3: Missing variant_id (MUST FAIL)
echo -e "\n  TEST 6.3: Missing variant_id..."
RESPONSE=$(curl -s -X POST "$FUNCTION_URL" \
  -H "Authorization: Bearer $STAFF_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"event_type\": \"SALE\",
    \"quantity\": -1,
    \"from_location_id\": \"$STORE_ID\"
  }")

if echo "$RESPONSE" | jq -e '.success == false' > /dev/null; then
    echo -e "${GREEN}    ✅ Correctly rejected missing variant_id${NC}"
else
    echo -e "${RED}    ❌ CRITICAL: Accepted event without variant_id${NC}"
    exit 1
fi

# Test 6.4: Zero quantity (MUST FAIL)
echo -e "\n  TEST 6.4: Zero quantity..."
RESPONSE=$(curl -s -X POST "$FUNCTION_URL" \
  -H "Authorization: Bearer $STAFF_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"event_type\": \"SALE\",
    \"variant_id\": \"$VARIANT_ID\",
    \"quantity\": 0,
    \"from_location_id\": \"$STORE_ID\"
  }")

if echo "$RESPONSE" | jq -e '.success == false' > /dev/null; then
    echo -e "${GREEN}    ✅ Correctly rejected zero quantity${NC}"
else
    echo -e "${RED}    ❌ CRITICAL: Accepted zero quantity${NC}"
    exit 1
fi

# Test 6.5: Wrong location for role (MUST FAIL)
echo -e "\n  TEST 6.5: Staff accessing wrong location..."
RESPONSE=$(curl -s -X POST "$FUNCTION_URL" \
  -H "Authorization: Bearer $STAFF_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"event_type\": \"PURCHASE\",
    \"variant_id\": \"$VARIANT_ID\",
    \"quantity\": 100,
    \"to_location_id\": \"$GODOWN_ID\",
    \"channel\": \"MANUAL\"
  }")

if echo "$RESPONSE" | jq -e '.success == false and (.error | contains("access"))' > /dev/null; then
    echo -e "${GREEN}    ✅ Correctly rejected unauthorized location${NC}"
else
    echo -e "${RED}    ❌ CRITICAL: Staff accessed unauthorized location${NC}"
    echo "    Response: $RESPONSE"
    exit 1
fi

# Test 6.6: Invalid event_type (MUST FAIL)
echo -e "\n  TEST 6.6: Invalid event_type..."
RESPONSE=$(curl -s -X POST "$FUNCTION_URL" \
  -H "Authorization: Bearer $STAFF_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"event_type\": \"INVALID_TYPE\",
    \"variant_id\": \"$VARIANT_ID\",
    \"quantity\": -1,
    \"from_location_id\": \"$STORE_ID\"
  }")

if echo "$RESPONSE" | jq -e '.success == false' > /dev/null; then
    echo -e "${GREEN}    ✅ Correctly rejected invalid event_type${NC}"
else
    echo -e "${RED}    ❌ CRITICAL: Accepted invalid event_type${NC}"
    exit 1
fi

# Test 6.7: SALE with positive quantity (MUST FAIL)
echo -e "\n  TEST 6.7: SALE with positive quantity..."
RESPONSE=$(curl -s -X POST "$FUNCTION_URL" \
  -H "Authorization: Bearer $STAFF_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"event_type\": \"SALE\",
    \"variant_id\": \"$VARIANT_ID\",
    \"quantity\": 5,
    \"from_location_id\": \"$STORE_ID\"
  }")

if echo "$RESPONSE" | jq -e '.success == false' > /dev/null; then
    echo -e "${GREEN}    ✅ Correctly rejected SALE with positive quantity${NC}"
else
    echo -e "${RED}    ❌ CRITICAL: Accepted SALE with positive quantity${NC}"
    exit 1
fi

# Test 6.8: PURCHASE with negative quantity (MUST FAIL)
echo -e "\n  TEST 6.8: PURCHASE with negative quantity..."
RESPONSE=$(curl -s -X POST "$FUNCTION_URL" \
  -H "Authorization: Bearer $OWNER_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"event_type\": \"PURCHASE\",
    \"variant_id\": \"$VARIANT_ID\",
    \"quantity\": -100,
    \"to_location_id\": \"$GODOWN_ID\"
  }")

if echo "$RESPONSE" | jq -e '.success == false' > /dev/null; then
    echo -e "${GREEN}    ✅ Correctly rejected PURCHASE with negative quantity${NC}"
else
    echo -e "${RED}    ❌ CRITICAL: Accepted PURCHASE with negative quantity${NC}"
    exit 1
fi

# =====================================================
# TEST 7: NEGATIVE STOCK PREVENTION TEST (CRITICAL)
# =====================================================

echo -e "\n${BLUE}⚖️ TEST 7: NEGATIVE STOCK PREVENTION TEST (CRITICAL)${NC}"

# Get current stock
CURRENT_STOCK=$(supabase db execute "
SELECT COALESCE(current_quantity, 0) 
FROM current_stock_view 
WHERE variant_id = '$VARIANT_ID' AND location_id = '$STORE_ID'
LIMIT 1" --output json | jq -r '.[0].coalesce')

echo "  Current stock for test variant: $CURRENT_STOCK units"

# Test 7.1: Try to sell more than available (MUST FAIL)
echo -e "\n  TEST 7.1: Attempting to sell $(($CURRENT_STOCK + 10)) units (more than available)..."
RESPONSE=$(curl -s -X POST "$FUNCTION_URL" \
  -H "Authorization: Bearer $STAFF_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"event_type\": \"SALE\",
    \"variant_id\": \"$VARIANT_ID\",
    \"quantity\": -$(($CURRENT_STOCK + 10)),
    \"from_location_id\": \"$STORE_ID\",
    \"channel\": \"STORE\"
  }")

if echo "$RESPONSE" | jq -e '.success == false and (.error | contains("Insufficient"))' > /dev/null; then
    echo -e "${GREEN}    ✅ Correctly prevented negative stock${NC}"
    DETAILS=$(echo "$RESPONSE" | jq -r '.details')
    echo "    Details: $DETAILS"
else
    echo -e "${RED}    ❌ CRITICAL: Negative stock allowed!${NC}"
    echo "    Response: $RESPONSE"
    exit 1
fi

# Test 7.2: Sell exact available stock (MUST SUCCEED)
if [ "$CURRENT_STOCK" -gt 0 ]; then
    echo -e "\n  TEST 7.2: Selling exact available stock ($CURRENT_STOCK units)..."
    RESPONSE=$(curl -s -X POST "$FUNCTION_URL" \
      -H "Authorization: Bearer $STAFF_TOKEN" \
      -H "Content-Type: application/json" \
      -d "{
        \"event_type\": \"SALE\",
        \"variant_id\": \"$VARIANT_ID\",
        \"quantity\": -$CURRENT_STOCK,
        \"from_location_id\": \"$STORE_ID\",
        \"channel\": \"STORE\",
        \"reference_number\": \"TEST-EXACT-STOCK\"
      }")
    
    if echo "$RESPONSE" | jq -e '.success == true' > /dev/null; then
        echo -e "${GREEN}    ✅ Exact stock sale accepted${NC}"
    else
        echo -e "${RED}    ❌ Exact stock sale rejected: $RESPONSE${NC}"
        exit 1
    fi
    
    # Verify stock is now zero
    NEW_STOCK=$(supabase db execute "
    SELECT COALESCE(current_quantity, 0) 
    FROM current_stock_view 
    WHERE variant_id = '$VARIANT_ID' AND location_id = '$STORE_ID'
    LIMIT 1" --output json | jq -r '.[0].coalesce')
    
    if [ "$NEW_STOCK" -eq 0 ]; then
        echo -e "${GREEN}    ✅ Stock correctly updated to zero${NC}"
    else
        echo -e "${RED}    ❌ Stock calculation error. Expected 0, got $NEW_STOCK${NC}"
        exit 1
    fi
else
    echo -e "${YELLOW}    ⚠️  No stock available to test exact sale${NC}"
fi

# =====================================================
# TEST 8: IDEMPOTENCY TEST (SYNC SAFETY)
# =====================================================

echo -e "\n${BLUE}🔁 TEST 8: IDEMPOTENCY TEST (SYNC SAFETY)${NC}"

# Test 8.1: Send event with specific ID
IDEMPOTENT_ID="idem9999-9999-9999-9999-999999999999"
echo -e "\n  TEST 8.1: Sending event with ID: $IDEMPOTENT_ID"

RESPONSE1=$(curl -s -X POST "$FUNCTION_URL" \
  -H "Authorization: Bearer $OWNER_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"event_id\": \"$IDEMPOTENT_ID\",
    \"event_type\": \"ADJUSTMENT\",
    \"variant_id\": \"$VARIANT_ID\",
    \"quantity\": 1,
    \"to_location_id\": \"$STORE_ID\",
    \"channel\": \"MANUAL\"
  }")

if echo "$RESPONSE1" | jq -e '.success == true' > /dev/null; then
    echo -e "${GREEN}    ✅ First event accepted${NC}"
else
    echo -e "${RED}    ❌ First event rejected: $RESPONSE1${NC}"
    exit 1
fi

# Test 8.2: Send same event again (MUST be idempotent)
echo -e "\n  TEST 8.2: Sending SAME event again..."
RESPONSE2=$(curl -s -X POST "$FUNCTION_URL" \
  -H "Authorization: Bearer $OWNER_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"event_id\": \"$IDEMPOTENT_ID\",
    \"event_type\": \"ADJUSTMENT\",
    \"variant_id\": \"$VARIANT_ID\",
    \"quantity\": 1,
    \"to_location_id\": \"$STORE_ID\",
    \"channel\": \"MANUAL\"
  }")

if echo "$RESPONSE2" | jq -e '.success == true' > /dev/null; then
    echo -e "${GREEN}    ✅ Second event also succeeded (idempotent)${NC}"
    
    # Verify only ONE entry exists
    COUNT=$(supabase db execute "
    SELECT COUNT(*) as count FROM event_ledger 
    WHERE event_id = '$IDEMPOTENT_ID'" --output json | jq -r '.[0].count')
    
    if [ "$COUNT" -eq 1 ]; then
        echo -e "${GREEN}    ✅ Only ONE entry in database (correct)${NC}"
    else
        echo -e "${RED}    ❌ CRITICAL: Found $COUNT entries! Idempotency failed!${NC}"
        exit 1
    fi
else
    echo -e "${RED}    ❌ Second event failed: $RESPONSE2${NC}"
    exit 1
fi

# =====================================================
# TEST 8.3: ACCOUNTANT CANNOT CREATE EVENTS
# =====================================================

echo -e "\n${BLUE}🔐 TEST 8.3: ACCOUNTANT restriction${NC}"

echo -e "\n  Testing ACCOUNTANT cannot create events..."
RESPONSE=$(curl -s -X POST "$FUNCTION_URL" \
  -H "Authorization: Bearer $ACCOUNTANT_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"event_type\": \"SALE\",
    \"variant_id\": \"$VARIANT_ID\",
    \"quantity\": -1,
    \"from_location_id\": \"$STORE_ID\"
  }")

if echo "$RESPONSE" | jq -e '.success == false and (.error | contains("not authorized") or contains("ACCOUNTANT"))' > /dev/null; then
    echo -e "${GREEN}    ✅ ACCOUNTANT correctly blocked from creating events${NC}"
else
    echo -e "${RED}    ❌ CRITICAL: ACCOUNTANT can create events!${NC}"
    echo "    Response: $RESPONSE"
    exit 1
fi

# =====================================================
# SUMMARY
# =====================================================

echo -e "\n${GREEN}==================================================${NC}"
echo -e "${GREEN}✅ PHASE 3 TESTS COMPLETE${NC}"
echo -e "${GREEN}==================================================${NC}"
echo "Summary:"
echo "  ✅ Valid events accepted"
echo "  ✅ Invalid events rejected"
echo "  ✅ Negative stock prevented"
echo "  ✅ Idempotency working"
echo "  ✅ Role restrictions enforced"
echo "  ✅ ACCOUNTANT blocked from events"
echo -e "${GREEN}==================================================${NC}"
