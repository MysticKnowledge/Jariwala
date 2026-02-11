#!/bin/bash

# =====================================================
# COMPLETE DEPLOYMENT SCRIPT
# Deploys database schema, RLS, and Edge Functions
# =====================================================

set -e  # Exit on any error

echo "🚀 Starting deployment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# =====================================================
# CONFIGURATION
# =====================================================

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo -e "${RED}❌ Supabase CLI not found. Please install it first.${NC}"
    echo "Visit: https://supabase.com/docs/guides/cli"
    exit 1
fi

# Check if logged in
if ! supabase projects list &> /dev/null; then
    echo -e "${YELLOW}⚠️  Not logged in to Supabase. Running login...${NC}"
    supabase login
fi

echo -e "${GREEN}✅ Supabase CLI found and authenticated${NC}"

# =====================================================
# STEP 1: DATABASE SCHEMA
# =====================================================

echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}📦 Step 1: Deploying Database Schema${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"

echo "Applying database-schema.sql..."
supabase db push --db-url "$DATABASE_URL" < database-schema.sql || {
    echo -e "${YELLOW}⚠️  Note: Some errors may occur if tables already exist${NC}"
}

echo -e "${GREEN}✅ Base schema deployed${NC}"

# =====================================================
# STEP 2: EVENT LEDGER & RLS
# =====================================================

echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}🔒 Step 2: Deploying Event Ledger & RLS${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"

echo "Applying database-event-ledger-rls.sql..."
supabase db push --db-url "$DATABASE_URL" < database-event-ledger-rls.sql || {
    echo -e "${YELLOW}⚠️  Note: Some RLS policies may already exist${NC}"
}

echo -e "${GREEN}✅ Event ledger and RLS policies deployed${NC}"

# =====================================================
# STEP 3: REPORTS & VIEWS
# =====================================================

echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}📊 Step 3: Deploying Report Views${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"

echo "Applying database-reports-views.sql..."
supabase db push --db-url "$DATABASE_URL" < database-reports-views.sql

echo -e "${GREEN}✅ Report views deployed${NC}"

# =====================================================
# STEP 4: EDGE FUNCTIONS
# =====================================================

echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}⚡ Step 4: Deploying Edge Functions${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"

# Deploy sync_event function
echo "Deploying sync_event function..."
supabase functions deploy sync_event --no-verify-jwt
echo -e "${GREEN}✅ sync_event deployed${NC}"

# Deploy whatsapp_bot function
echo "Deploying whatsapp_bot function..."
supabase functions deploy whatsapp_bot --no-verify-jwt
echo -e "${GREEN}✅ whatsapp_bot deployed${NC}"

# =====================================================
# STEP 5: DEPLOY EDGE FUNCTIONS
# =====================================================

echo "🌐 Step 5: Deploying Edge Functions..."
cd supabase/functions

# Deploy sync_event
echo "  Deploying sync_event..."
supabase functions deploy sync_event --no-verify-jwt

# Deploy Waziper WhatsApp webhook
echo "  Deploying waziper-webhook..."
supabase functions deploy waziper-webhook --no-verify-jwt

echo "✅ Edge functions deployed"
echo ""

echo "📱 Step 6: Configure Waziper (Optional)"
echo "  See: deployment-scripts/WAZIPER-SETUP.md"
echo "  Set secrets:"
echo "    supabase secrets set WAZIPER_API_TOKEN='your-token'"
echo "    supabase secrets set WAZIPER_INSTANCE_ID='your-id'"
echo "    supabase secrets set WAZIPER_VERIFY_TOKEN='your-verify-token'"
echo ""

# =====================================================
# STEP 7: VERIFY DEPLOYMENT
# =====================================================

echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}✅ Step 7: Verification${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"

echo "Listing deployed functions..."
supabase functions list

echo -e "\n${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}🎉 Deployment Complete!${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"

echo "Next steps:"
echo "1. Run test suite: ./deployment-scripts/run-tests.sh"
echo "2. Insert initial data: ./deployment-scripts/seed-data.sh"
echo "3. Check Edge Function logs: supabase functions logs sync_event"

echo -e "\n${GREEN}✨ Ready to go!${NC}\n"