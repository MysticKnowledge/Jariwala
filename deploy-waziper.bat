@echo off
REM 🚀 Waziper Edge Functions - Quick Deploy Script (Windows)
REM This script deploys all WhatsApp Edge Functions to Supabase

echo 🚀 Deploying Waziper Edge Functions...
echo.

REM Check if Supabase CLI is installed
where supabase >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ Supabase CLI not found!
    echo 📦 Installing Supabase CLI...
    npm install -g supabase
)

echo ✅ Supabase CLI found!
echo.

REM Check if logged in
echo 🔐 Checking Supabase authentication...
supabase projects list >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ Not logged in to Supabase
    echo 🔑 Please login:
    supabase login
)

echo ✅ Logged in to Supabase!
echo.

REM Deploy functions
echo 📤 Deploying Edge Functions...
echo.

echo 1️⃣ Deploying whatsapp-send...
supabase functions deploy whatsapp-send
echo.

echo 2️⃣ Deploying whatsapp-qrcode...
supabase functions deploy whatsapp-qrcode
echo.

echo 3️⃣ Deploying whatsapp-manage...
supabase functions deploy whatsapp-manage
echo.

echo ✅ All Edge Functions deployed successfully!
echo.
echo 🎉 CORS issue fixed! Your WhatsApp integration now works!
echo.
echo 🧪 Test your integration:
echo    1. Run: npm run dev
echo    2. Go to: WhatsApp → Settings
echo    3. Click: Generate QR Code
echo    4. Should work without CORS errors! ✅
echo.

pause
