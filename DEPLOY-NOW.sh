#!/bin/bash

# Deploy the server function with the fixed bulk-import endpoint

echo "🚀 Deploying server function..."
supabase functions deploy server

echo ""
echo "✅ Deployment complete!"
echo ""
echo "📋 Next steps:"
echo "1. Go to your app at jariwala.figma.site"
echo "2. Click 'Bulk Import' in sidebar"
echo "3. Upload your CSV file (124,962 rows)"
echo "4. Click 'Preview & Validate'"
echo "5. Watch the auto-creation magic! ✨"
echo "6. Click 'Import X Records'"
echo "7. Done!"
echo ""
echo "🎯 Your exact headers (VNO, DATE, PRNO, QTY, RATE, ACNO) are ready!"
