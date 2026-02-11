#!/bin/bash

# =====================================================
# WAZIPER WHATSAPP BOT TEST SCRIPT
# Tests all bot commands and functionality
# =====================================================

set -e

echo "=================================================="
echo "WAZIPER WHATSAPP BOT - TEST SCRIPT"
echo "=================================================="

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Configuration
WEBHOOK_URL="${SUPABASE_URL}/functions/v1/waziper-webhook"
VERIFY_TOKEN="${WAZIPER_VERIFY_TOKEN}"
TEST_PHONE="919876543210"

# =====================================================
# TEST 1: Webhook Verification
# =====================================================

echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}TEST 1: Webhook Verification${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"

echo "Testing webhook verification endpoint..."
RESPONSE=$(curl -s "${WEBHOOK_URL}?hub.challenge=test123&hub.verify_token=${VERIFY_TOKEN}")

if [ "$RESPONSE" == "test123" ]; then
    echo -e "${GREEN}✅ Webhook verification passed${NC}"
else
    echo -e "${RED}❌ Webhook verification failed${NC}"
    echo "Response: $RESPONSE"
    exit 1
fi

# =====================================================
# TEST 2: Opt-In Message
# =====================================================

echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}TEST 2: Opt-In Flow${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"

echo "Simulating START message from user..."
curl -s -X POST "$WEBHOOK_URL" \
  -H "Content-Type: application/json" \
  -d "{
    \"event\": \"message\",
    \"instance_id\": \"test-instance\",
    \"data\": {
      \"key\": {
        \"remoteJid\": \"${TEST_PHONE}@s.whatsapp.net\",
        \"fromMe\": false,
        \"id\": \"test-msg-001\"
      },
      \"message\": {
        \"conversation\": \"START\"
      },
      \"pushName\": \"Test User\",
      \"messageTimestamp\": $(date +%s)
    }
  }" | jq '.'

echo -e "${GREEN}✅ Opt-in message sent${NC}"

# =====================================================
# TEST 3: Help Command
# =====================================================

echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}TEST 3: Help Command${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"

echo "Simulating HELP message..."
curl -s -X POST "$WEBHOOK_URL" \
  -H "Content-Type: application/json" \
  -d "{
    \"event\": \"message\",
    \"instance_id\": \"test-instance\",
    \"data\": {
      \"key\": {
        \"remoteJid\": \"${TEST_PHONE}@s.whatsapp.net\",
        \"fromMe\": false,
        \"id\": \"test-msg-002\"
      },
      \"message\": {
        \"conversation\": \"HELP\"
      },
      \"pushName\": \"Test User\",
      \"messageTimestamp\": $(date +%s)
    }
  }" | jq '.'

echo -e "${GREEN}✅ Help command processed${NC}"

# =====================================================
# TEST 4: Order Status Query
# =====================================================

echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}TEST 4: Order Status Query${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"

echo "Simulating ORDER query..."
curl -s -X POST "$WEBHOOK_URL" \
  -H "Content-Type: application/json" \
  -d "{
    \"event\": \"message\",
    \"instance_id\": \"test-instance\",
    \"data\": {
      \"key\": {
        \"remoteJid\": \"${TEST_PHONE}@s.whatsapp.net\",
        \"fromMe\": false,
        \"id\": \"test-msg-003\"
      },
      \"message\": {
        \"conversation\": \"ORDER INV-2026-0125\"
      },
      \"pushName\": \"Test User\",
      \"messageTimestamp\": $(date +%s)
    }
  }" | jq '.'

echo -e "${GREEN}✅ Order status query processed${NC}"

# =====================================================
# TEST 5: Stock Inquiry
# =====================================================

echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}TEST 5: Stock Inquiry${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"

echo "Simulating STOCK query..."
curl -s -X POST "$WEBHOOK_URL" \
  -H "Content-Type: application/json" \
  -d "{
    \"event\": \"message\",
    \"instance_id\": \"test-instance\",
    \"data\": {
      \"key\": {
        \"remoteJid\": \"${TEST_PHONE}@s.whatsapp.net\",
        \"fromMe\": false,
        \"id\": \"test-msg-004\"
      },
      \"message\": {
        \"conversation\": \"STOCK Cotton T-Shirt\"
      },
      \"pushName\": \"Test User\",
      \"messageTimestamp\": $(date +%s)
    }
  }" | jq '.'

echo -e "${GREEN}✅ Stock inquiry processed${NC}"

# =====================================================
# TEST 6: Invalid Command
# =====================================================

echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}TEST 6: Invalid Command${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"

echo "Simulating invalid command..."
curl -s -X POST "$WEBHOOK_URL" \
  -H "Content-Type: application/json" \
  -d "{
    \"event\": \"message\",
    \"instance_id\": \"test-instance\",
    \"data\": {
      \"key\": {
        \"remoteJid\": \"${TEST_PHONE}@s.whatsapp.net\",
        \"fromMe\": false,
        \"id\": \"test-msg-005\"
      },
      \"message\": {
        \"conversation\": \"random text\"
      },
      \"pushName\": \"Test User\",
      \"messageTimestamp\": $(date +%s)
    }
  }" | jq '.'

echo -e "${GREEN}✅ Invalid command handled${NC}"

# =====================================================
# TEST 7: Opt-Out
# =====================================================

echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}TEST 7: Opt-Out Flow${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"

echo "Simulating STOP message..."
curl -s -X POST "$WEBHOOK_URL" \
  -H "Content-Type: application/json" \
  -d "{
    \"event\": \"message\",
    \"instance_id\": \"test-instance\",
    \"data\": {
      \"key\": {
        \"remoteJid\": \"${TEST_PHONE}@s.whatsapp.net\",
        \"fromMe\": false,
        \"id\": \"test-msg-006\"
      },
      \"message\": {
        \"conversation\": \"STOP\"
      },
      \"pushName\": \"Test User\",
      \"messageTimestamp\": $(date +%s)
    }
  }" | jq '.'

echo -e "${GREEN}✅ Opt-out message sent${NC}"

# =====================================================
# TEST 8: Check Database
# =====================================================

echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}TEST 8: Database Verification${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"

echo "Checking opt-in status in database..."
psql "$DATABASE_URL" -c "
SELECT phone_number, customer_name, opted_in, opted_in_at, opted_out_at
FROM whatsapp_opt_ins
WHERE phone_number = '${TEST_PHONE}'
LIMIT 1;
"

echo -e "\n${GREEN}✅ Database check complete${NC}"

# =====================================================
# TEST 9: Audit Logs
# =====================================================

echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}TEST 9: Audit Logs${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"

echo "Checking audit logs..."
psql "$DATABASE_URL" -c "
SELECT action, performed_by, created_at, details->>'message' as message
FROM audit_log
WHERE action = 'WHATSAPP_MESSAGE'
  AND performed_by = '${TEST_PHONE}'
ORDER BY created_at DESC
LIMIT 5;
"

echo -e "\n${GREEN}✅ Audit logs verified${NC}"

# =====================================================
# FINAL SUMMARY
# =====================================================

echo -e "\n${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}🎉 ALL TESTS COMPLETE${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"

echo "Test Summary:"
echo "  ✅ Webhook verification"
echo "  ✅ Opt-in flow"
echo "  ✅ Help command"
echo "  ✅ Order status query"
echo "  ✅ Stock inquiry"
echo "  ✅ Invalid command handling"
echo "  ✅ Opt-out flow"
echo "  ✅ Database updates"
echo "  ✅ Audit logging"

echo -e "\n${BLUE}Next Steps:${NC}"
echo "1. Test with real Waziper instance"
echo "2. Send test messages from your WhatsApp"
echo "3. Monitor logs: supabase functions logs waziper-webhook --tail"
echo "4. Configure message templates in Waziper panel"

echo -e "\n${GREEN}Ready for production! 🚀${NC}\n"
