#!/bin/bash

# ============================================
# WhatsApp Edge Functions Deployment Script
# ============================================
# This script deploys all WhatsApp-related Edge Functions to Supabase
# Domain: jariwala.figma.site
# Date: January 30, 2026

set -e  # Exit on any error

echo "🚀 Starting WhatsApp Edge Functions Deployment..."
echo ""
echo "📋 Functions to deploy:"
echo "   1. whatsapp-send      - Send WhatsApp messages"
echo "   2. whatsapp-qrcode    - Get QR code for authentication"
echo "   3. whatsapp-manage    - Manage instance (status, reboot, reconnect)"
echo "   4. waziper-webhook    - Webhook for incoming messages"
echo "   5. whatsapp_bot       - WhatsApp bot for customer support"
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

echo "📤 [1/5] Deploying whatsapp-send..."
supabase functions deploy whatsapp-send --no-verify-jwt
echo "✅ whatsapp-send deployed"
echo ""

echo "📤 [2/5] Deploying whatsapp-qrcode..."
supabase functions deploy whatsapp-qrcode --no-verify-jwt
echo "✅ whatsapp-qrcode deployed"
echo ""

echo "📤 [3/5] Deploying whatsapp-manage..."
supabase functions deploy whatsapp-manage --no-verify-jwt
echo "✅ whatsapp-manage deployed"
echo ""

echo "📤 [4/5] Deploying waziper-webhook..."
supabase functions deploy waziper-webhook --no-verify-jwt
echo "✅ waziper-webhook deployed"
echo ""

echo "📤 [5/5] Deploying whatsapp_bot..."
supabase functions deploy whatsapp_bot --no-verify-jwt
echo "✅ whatsapp_bot deployed"
echo ""

echo "🎉 All Edge Functions deployed successfully!"
echo ""
echo "📝 Next Steps:"
echo "   1. Your app will automatically use Edge Functions (no CORS!)"
echo "   2. Test WhatsApp features at https://jariwala.figma.site"
echo "   3. Go to WhatsApp panel and try 'Generate QR Code'"
echo ""
echo "✅ Production Ready!"
echo ""
echo "🔗 Edge Function URLs:"
echo "   • Send Message:  https://YOUR_PROJECT.supabase.co/functions/v1/whatsapp-send"
echo "   • QR Code:       https://YOUR_PROJECT.supabase.co/functions/v1/whatsapp-qrcode"
echo "   • Manage:        https://YOUR_PROJECT.supabase.co/functions/v1/whatsapp-manage"
echo "   • Webhook:       https://YOUR_PROJECT.supabase.co/functions/v1/waziper-webhook"
echo "   • Bot:           https://YOUR_PROJECT.supabase.co/functions/v1/whatsapp_bot"
echo ""
echo "📚 Documentation: /PRODUCTION-SETUP.md"
echo ""
