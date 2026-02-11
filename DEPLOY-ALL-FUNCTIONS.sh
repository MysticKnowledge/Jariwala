#!/bin/bash

# ============================================
# COMPLETE SUPABASE DEPLOYMENT SCRIPT
# Deploys ALL Edge Functions to Production
# ============================================
# Domain: jariwala.figma.site
# Date: February 10, 2026

set -e  # Exit on any error

echo "============================================"
echo "🚀 COMPLETE SUPABASE DEPLOYMENT"
echo "============================================"
echo ""
echo "📋 Functions to deploy:"
echo "   1. server           - Main API server with KV store"
echo "   2. sync_event       - Event synchronization with validation"
echo "   3. whatsapp-send    - Send WhatsApp messages"
echo "   4. whatsapp-qrcode  - Get QR code for authentication"
echo "   5. whatsapp-manage  - Manage instance (status, reboot, reconnect)"
echo "   6. waziper-webhook  - Webhook for incoming messages"
echo "   7. whatsapp_bot     - WhatsApp bot for customer support"
echo ""

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI is not installed"
    echo ""
    echo "📦 Installing Supabase CLI..."
    npm install -g supabase
    echo "✅ Supabase CLI installed successfully"
    echo ""
fi

# Check if user is logged in
echo "🔐 Checking Supabase authentication..."
if ! supabase projects list &> /dev/null; then
    echo "❌ Not logged in to Supabase"
    echo ""
    echo "🔑 Please login to Supabase:"
    supabase login
    echo ""
fi

echo "✅ Authenticated with Supabase"
echo ""

# Deploy Edge Functions
echo "📤 Deploying Edge Functions..."
echo ""

echo "📤 [1/7] Deploying server (main API)..."
supabase functions deploy server --no-verify-jwt
echo "✅ server deployed"
echo ""

echo "📤 [2/7] Deploying sync_event (event synchronization)..."
supabase functions deploy sync_event --no-verify-jwt
echo "✅ sync_event deployed"
echo ""

echo "📤 [3/7] Deploying whatsapp-send..."
supabase functions deploy whatsapp-send --no-verify-jwt
echo "✅ whatsapp-send deployed"
echo ""

echo "📤 [4/7] Deploying whatsapp-qrcode..."
supabase functions deploy whatsapp-qrcode --no-verify-jwt
echo "✅ whatsapp-qrcode deployed"
echo ""

echo "📤 [5/7] Deploying whatsapp-manage..."
supabase functions deploy whatsapp-manage --no-verify-jwt
echo "✅ whatsapp-manage deployed"
echo ""

echo "📤 [6/7] Deploying waziper-webhook..."
supabase functions deploy waziper-webhook --no-verify-jwt
echo "✅ waziper-webhook deployed"
echo ""

echo "📤 [7/7] Deploying whatsapp_bot..."
supabase functions deploy whatsapp_bot --no-verify-jwt
echo "✅ whatsapp_bot deployed"
echo ""

echo "============================================"
echo "🎉 ALL EDGE FUNCTIONS DEPLOYED!"
echo "============================================"
echo ""
echo "📝 Deployed Functions:"
echo "   ✅ server           - Main API server"
echo "   ✅ sync_event       - Event synchronization"
echo "   ✅ whatsapp-send    - Send messages"
echo "   ✅ whatsapp-qrcode  - QR authentication"
echo "   ✅ whatsapp-manage  - Instance management"
echo "   ✅ waziper-webhook  - Incoming webhooks"
echo "   ✅ whatsapp_bot     - Customer support bot"
echo ""
echo "🔗 Your app: https://jariwala.figma.site"
echo ""
echo "📚 Next Steps:"
echo "   1. Test WhatsApp features (no CORS errors!)"
echo "   2. Test event synchronization"
echo "   3. Monitor logs: supabase functions logs"
echo ""
echo "✅ PRODUCTION READY!"
echo ""
