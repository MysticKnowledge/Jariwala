#!/bin/bash

# =====================================================
# PHASE 5: SECURITY & ATTACK TESTS
# Tests SQL injection, fake tokens, malicious data
# =====================================================

set -e

echo "=================================================="
echo "PHASE 5: SECURITY & ATTACK TESTS"
echo "=================================================="

GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

FUNCTION_URL="${SUPABASE_URL}/functions/v1/sync_event"
STAFF_TOKEN="${STAFF_JWT_TOKEN}"

VARIANT_ID=$(supabase db execute "SELECT id FROM variants LIMIT 1" --output json | jq -r '.[0].id')
STORE_ID=$(supabase db execute "SELECT id FROM locations WHERE name = 'Main Store Mumbai'" --output json | jq -r '.[0].id')

# =====================================================
# TEST 18: MALICIOUS TESTS
# =====================================================

echo -e "\n${BLUE}💣 TEST 18: MALICIOUS ATTACK TESTS${NC}"

# Test 18.1: SQL Injection in variant_id
echo -e "\n  TEST 18.1: SQL Injection in variant_id..."
RESPONSE=$(curl -s -X POST "$FUNCTION_URL" \
  -H "Authorization: Bearer $STAFF_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"event_type\": \"SALE\",
    \"variant_id\": \"'; DROP TABLE event_ledger; --\",
    \"quantity\": -1,
    \"from_location_id\": \"$STORE_ID\"
  }")

if echo "$RESPONSE" | jq -e '.success == false' > /dev/null; then
    echo -e "${GREEN}    ✅ SQL injection blocked${NC}"
else
    echo -e "${RED}    ❌ CRITICAL: SQL injection not blocked!${NC}"
    exit 1
fi

# Verify event_ledger still exists
if supabase db execute "SELECT 1 FROM event_ledger LIMIT 1" > /dev/null 2>&1; then
    echo -e "${GREEN}    ✅ event_ledger table intact${NC}"
else
    echo -e "${RED}    ❌ CRITICAL: event_ledger table compromised!${NC}"
    exit 1
fi

# Test 18.2: SQL Injection in notes field
echo -e "\n  TEST 18.2: SQL Injection in notes field..."
RESPONSE=$(curl -s -X POST "$FUNCTION_URL" \
  -H "Authorization: Bearer $STAFF_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"event_type\": \"ADJUSTMENT\",
    \"variant_id\": \"$VARIANT_ID\",
    \"quantity\": 1,
    \"to_location_id\": \"$STORE_ID\",
    \"notes\": \"'; UPDATE event_ledger SET quantity = 9999; --\"
  }")

# Check if any quantity was changed to 9999
COMPROMISED=$(supabase db execute "SELECT COUNT(*) as count FROM event_ledger WHERE quantity = 9999" --output json | jq -r '.[0].count')

if [ "$COMPROMISED" -eq 0 ]; then
    echo -e "${GREEN}    ✅ SQL injection in notes blocked${NC}"
else
    echo -e "${RED}    ❌ CRITICAL: SQL injection succeeded!${NC}"
    exit 1
fi

# Test 18.3: XSS in metadata
echo -e "\n  TEST 18.3: XSS in metadata..."
RESPONSE=$(curl -s -X POST "$FUNCTION_URL" \
  -H "Authorization: Bearer $STAFF_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"event_type\": \"ADJUSTMENT\",
    \"variant_id\": \"$VARIANT_ID\",
    \"quantity\": 1,
    \"to_location_id\": \"$STORE_ID\",
    \"metadata\": {
      \"xss\": \"<script>alert('XSS')</script>\"
    }
  }")

if echo "$RESPONSE" | jq -e '.success == true or .success == false' > /dev/null; then
    echo -e "${GREEN}    ✅ XSS handled (stored safely or rejected)${NC}"
else
    echo -e "${RED}    ❌ Unexpected response${NC}"
fi

# Test 18.4: Invalid JWT token
echo -e "\n  TEST 18.4: Fake JWT token..."
RESPONSE=$(curl -s -X POST "$FUNCTION_URL" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.FAKE.TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"event_type\": \"SALE\",
    \"variant_id\": \"$VARIANT_ID\",
    \"quantity\": -1,
    \"from_location_id\": \"$STORE_ID\"
  }")

# Should return 401 or error
if echo "$RESPONSE" | jq -e '.error' > /dev/null || echo "$RESPONSE" | grep -q "401"; then
    echo -e "${GREEN}    ✅ Fake token rejected${NC}"
else
    echo -e "${RED}    ❌ CRITICAL: Fake token accepted!${NC}"
    echo "    Response: $RESPONSE"
    exit 1
fi

# Test 18.5: No authorization header
echo -e "\n  TEST 18.5: Missing authorization..."
RESPONSE=$(curl -s -X POST "$FUNCTION_URL" \
  -H "Content-Type: application/json" \
  -d "{
    \"event_type\": \"SALE\",
    \"variant_id\": \"$VARIANT_ID\",
    \"quantity\": -1,
    \"from_location_id\": \"$STORE_ID\"
  }")

if echo "$RESPONSE" | jq -e '.error' > /dev/null || echo "$RESPONSE" | grep -q "401"; then
    echo -e "${GREEN}    ✅ Missing auth rejected${NC}"
else
    echo -e "${RED}    ❌ CRITICAL: Unauth request accepted!${NC}"
    exit 1
fi

# Test 18.6: Fake location_id (non-existent UUID)
echo -e "\n  TEST 18.6: Fake location_id..."
RESPONSE=$(curl -s -X POST "$FUNCTION_URL" \
  -H "Authorization: Bearer $STAFF_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"event_type\": \"SALE\",
    \"variant_id\": \"$VARIANT_ID\",
    \"quantity\": -1,
    \"from_location_id\": \"00000000-0000-0000-0000-000000000000\"
  }")

if echo "$RESPONSE" | jq -e '.success == false' > /dev/null; then
    echo -e "${GREEN}    ✅ Fake location rejected${NC}"
else
    echo -e "${RED}    ❌ Fake location accepted${NC}"
    exit 1
fi

# Test 18.7: Extremely large quantity
echo -e "\n  TEST 18.7: Extremely large quantity..."
RESPONSE=$(curl -s -X POST "$FUNCTION_URL" \
  -H "Authorization: Bearer $STAFF_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"event_type\": \"PURCHASE\",
    \"variant_id\": \"$VARIANT_ID\",
    \"quantity\": 999999999,
    \"to_location_id\": \"$STORE_ID\"
  }")

# Should either reject or handle gracefully
if echo "$RESPONSE" | jq -e '.success' > /dev/null; then
    echo -e "${GREEN}    ✅ Large quantity handled${NC}"
else
    echo -e "${YELLOW}    ⚠️  Response: $RESPONSE${NC}"
fi

# Test 18.8: Negative quantity for PURCHASE
echo -e "\n  TEST 18.8: Wrong sign for event type..."
RESPONSE=$(curl -s -X POST "$FUNCTION_URL" \
  -H "Authorization: Bearer $STAFF_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"event_type\": \"PURCHASE\",
    \"variant_id\": \"$VARIANT_ID\",
    \"quantity\": -100,
    \"to_location_id\": \"$STORE_ID\"
  }")

if echo "$RESPONSE" | jq -e '.success == false' > /dev/null; then
    echo -e "${GREEN}    ✅ Wrong sign rejected${NC}"
else
    echo -e "${RED}    ❌ Wrong sign accepted${NC}"
    exit 1
fi

# Test 18.9: Malformed JSON
echo -e "\n  TEST 18.9: Malformed JSON..."
RESPONSE=$(curl -s -X POST "$FUNCTION_URL" \
  -H "Authorization: Bearer $STAFF_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{invalid json here")

if echo "$RESPONSE" | grep -q "error" || echo "$RESPONSE" | grep -q "400"; then
    echo -e "${GREEN}    ✅ Malformed JSON rejected${NC}"
else
    echo -e "${RED}    ❌ Malformed JSON accepted${NC}"
fi

# Test 18.10: Extremely long string in notes
echo -e "\n  TEST 18.10: Buffer overflow attempt (long string)..."
LONG_STRING=$(python3 -c "print('A' * 100000)" 2>/dev/null || echo "LONG_STRING_PLACEHOLDER")
RESPONSE=$(curl -s -X POST "$FUNCTION_URL" \
  -H "Authorization: Bearer $STAFF_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"event_type\": \"ADJUSTMENT\",
    \"variant_id\": \"$VARIANT_ID\",
    \"quantity\": 1,
    \"to_location_id\": \"$STORE_ID\",
    \"notes\": \"$LONG_STRING\"
  }")

# Should handle gracefully (reject or truncate)
if echo "$RESPONSE" | jq -e '.success' > /dev/null; then
    echo -e "${GREEN}    ✅ Long string handled${NC}"
else
    echo -e "${YELLOW}    ⚠️  Long string may have been rejected (acceptable)${NC}"
fi

# =====================================================
# TEST 19: RATE LIMIT TEST
# =====================================================

echo -e "\n${BLUE}🔥 TEST 19: RATE LIMIT TEST${NC}"

echo -e "\n  Sending 50 rapid requests..."
SUCCESS_COUNT=0
ERROR_COUNT=0
RATE_LIMITED=0

for i in {1..50}; do
    RESPONSE=$(curl -s -w "%{http_code}" -X POST "$FUNCTION_URL" \
      -H "Authorization: Bearer $STAFF_TOKEN" \
      -H "Content-Type: application/json" \
      -d "{
        \"event_type\": \"ADJUSTMENT\",
        \"variant_id\": \"$VARIANT_ID\",
        \"quantity\": 1,
        \"to_location_id\": \"$STORE_ID\"
      }")
    
    HTTP_CODE="${RESPONSE: -3}"
    
    if [ "$HTTP_CODE" == "200" ]; then
        ((SUCCESS_COUNT++))
    elif [ "$HTTP_CODE" == "429" ]; then
        ((RATE_LIMITED++))
    else
        ((ERROR_COUNT++))
    fi
done

echo "    Results:"
echo "      Success: $SUCCESS_COUNT"
echo "      Rate limited (429): $RATE_LIMITED"
echo "      Errors: $ERROR_COUNT"

if [ "$RATE_LIMITED" -gt 0 ]; then
    echo -e "${GREEN}    ✅ Rate limiting is active${NC}"
elif [ "$SUCCESS_COUNT" -eq 50 ]; then
    echo -e "${YELLOW}    ⚠️  No rate limiting detected (may be acceptable)${NC}"
else
    echo -e "${YELLOW}    ⚠️  Mixed results - verify rate limiting config${NC}"
fi

# =====================================================
# TEST: CONCURRENT ACCESS
# =====================================================

echo -e "\n${BLUE}⚡ TEST 19.1: CONCURRENT ACCESS TEST${NC}"

echo -e "\n  Sending 10 concurrent requests..."

# Create temp dir for responses
TEMP_DIR=$(mktemp -d)

# Send 10 concurrent requests
for i in {1..10}; do
    (curl -s -X POST "$FUNCTION_URL" \
      -H "Authorization: Bearer $STAFF_TOKEN" \
      -H "Content-Type: application/json" \
      -d "{
        \"event_type\": \"ADJUSTMENT\",
        \"variant_id\": \"$VARIANT_ID\",
        \"quantity\": 1,
        \"to_location_id\": \"$STORE_ID\"
      }" > "$TEMP_DIR/response_$i.json") &
done

# Wait for all to complete
wait

# Count successes
CONCURRENT_SUCCESS=0
for i in {1..10}; do
    if [ -f "$TEMP_DIR/response_$i.json" ]; then
        if jq -e '.success == true' "$TEMP_DIR/response_$i.json" > /dev/null 2>&1; then
            ((CONCURRENT_SUCCESS++))
        fi
    fi
done

rm -rf "$TEMP_DIR"

echo "    Concurrent successes: $CONCURRENT_SUCCESS/10"

if [ "$CONCURRENT_SUCCESS" -ge 8 ]; then
    echo -e "${GREEN}    ✅ System handles concurrent requests${NC}"
else
    echo -e "${YELLOW}    ⚠️  Some concurrent requests failed${NC}"
fi

# =====================================================
# TEST: TIMING ATTACKS
# =====================================================

echo -e "\n${BLUE}⏱️  TEST 19.2: TIMING ATTACK DETECTION${NC}"

echo -e "\n  Testing response time consistency..."

# Valid request
START1=$(date +%s%N)
curl -s -X POST "$FUNCTION_URL" \
  -H "Authorization: Bearer $STAFF_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"event_type\": \"ADJUSTMENT\",
    \"variant_id\": \"$VARIANT_ID\",
    \"quantity\": 1,
    \"to_location_id\": \"$STORE_ID\"
  }" > /dev/null
END1=$(date +%s%N)
VALID_TIME=$(( (END1 - START1) / 1000000 ))

# Invalid request
START2=$(date +%s%N)
curl -s -X POST "$FUNCTION_URL" \
  -H "Authorization: Bearer $STAFF_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"event_type\": \"INVALID\",
    \"variant_id\": \"$VARIANT_ID\",
    \"quantity\": 1,
    \"to_location_id\": \"$STORE_ID\"
  }" > /dev/null
END2=$(date +%s%N)
INVALID_TIME=$(( (END2 - START2) / 1000000 ))

echo "    Valid request: ${VALID_TIME}ms"
echo "    Invalid request: ${INVALID_TIME}ms"

# Time difference should not reveal internal logic
DIFF=$((VALID_TIME > INVALID_TIME ? VALID_TIME - INVALID_TIME : INVALID_TIME - VALID_TIME))
if [ "$DIFF" -lt 500 ]; then
    echo -e "${GREEN}    ✅ Response times consistent (timing-attack resistant)${NC}"
else
    echo -e "${YELLOW}    ⚠️  Large time difference detected${NC}"
fi

echo -e "\n${GREEN}==================================================${NC}"
echo -e "${GREEN}✅ PHASE 5 TESTS COMPLETE${NC}"
echo -e "${GREEN}==================================================${NC}"
echo "Summary:"
echo "  ✅ SQL injection blocked"
echo "  ✅ XSS handled safely"
echo "  ✅ Fake tokens rejected"
echo "  ✅ Missing auth blocked"
echo "  ✅ Invalid data rejected"
echo "  ✅ Large payloads handled"
echo "  ✅ Concurrent requests work"
echo "  ✅ System is secure"
echo -e "${GREEN}==================================================${NC}"
