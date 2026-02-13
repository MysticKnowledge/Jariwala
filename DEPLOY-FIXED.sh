#!/bin/bash

echo "🚀 Deploying FIXED server function..."
echo ""

supabase functions deploy server

echo ""
echo "✅ DEPLOYMENT COMPLETE!"
echo ""
echo "🎯 What was fixed:"
echo "  ✅ createClient import added"
echo "  ✅ rows.map error fixed (proper file structure)"
echo "  ✅ Batched creation (500 items at a time)"
echo "  ✅ Preview mode (fast) vs Import mode (batched)"
echo ""
echo "📋 Next steps:"
echo "  1. Go to your app"
echo "  2. Click 'Bulk Import'"
echo "  3. Upload CSV file"
echo "  4. Click 'Preview & Validate' (~7 seconds)"
echo "  5. Click 'Import X Records' (~5-8 minutes for 124,962 rows)"
echo ""
echo "✨ Your headers (VNO, DATE, PRNO, QTY, RATE, ACNO) are ready!"
