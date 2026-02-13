#!/bin/bash

# =====================================================
# DEPLOY SERVER FUNCTION WITH EXCEL IMPORT
# =====================================================

echo "🚀 Deploying server function with Excel import..."
echo ""

# Deploy the server function
echo "📦 Deploying server function..."
supabase functions deploy server

# Check deployment status
if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Server function deployed successfully!"
    echo ""
    echo "🎯 Endpoints available:"
    echo "   • /make-server-c45d1eeb/health"
    echo "   • /make-server-c45d1eeb/bulk-import"
    echo ""
    echo "📊 Test the import endpoint:"
    echo "   Upload an Excel file through the UI"
    echo ""
    echo "🎉 Excel import feature is now live!"
else
    echo ""
    echo "❌ Deployment failed!"
    echo "Please check your Supabase credentials and try again."
    exit 1
fi
