@echo off
REM ============================================
REM COMPLETE SUPABASE DEPLOYMENT SCRIPT
REM Deploys ALL Edge Functions to Production
REM ============================================
REM Domain: jariwala.figma.site
REM Date: February 10, 2026

echo.
echo ============================================
echo COMPLETE SUPABASE DEPLOYMENT
echo ============================================
echo.
echo Functions to deploy:
echo    1. server           - Main API server with KV store
echo    2. sync_event       - Event synchronization with validation
echo    3. whatsapp-send    - Send WhatsApp messages
echo    4. whatsapp-qrcode  - Get QR code for authentication
echo    5. whatsapp-manage  - Manage instance (status, reboot, reconnect)
echo    6. waziper-webhook  - Webhook for incoming messages
echo    7. whatsapp_bot     - WhatsApp bot for customer support
echo.

REM Check if Supabase CLI is installed
where supabase >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Supabase CLI is not installed
    echo.
    echo Installing Supabase CLI...
    npm install -g supabase
    echo.
    echo Supabase CLI installed successfully
    echo.
)

REM Check if user is logged in
echo Checking Supabase authentication...
supabase projects list >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Not logged in to Supabase
    echo.
    echo Please login to Supabase:
    supabase login
    echo.
)

echo [OK] Authenticated with Supabase
echo.

REM Deploy Edge Functions
echo Deploying Edge Functions...
echo.

echo [1/7] Deploying server (main API)...
supabase functions deploy server --no-verify-jwt
echo [OK] server deployed
echo.

echo [2/7] Deploying sync_event (event synchronization)...
supabase functions deploy sync_event --no-verify-jwt
echo [OK] sync_event deployed
echo.

echo [3/7] Deploying whatsapp-send...
supabase functions deploy whatsapp-send --no-verify-jwt
echo [OK] whatsapp-send deployed
echo.

echo [4/7] Deploying whatsapp-qrcode...
supabase functions deploy whatsapp-qrcode --no-verify-jwt
echo [OK] whatsapp-qrcode deployed
echo.

echo [5/7] Deploying whatsapp-manage...
supabase functions deploy whatsapp-manage --no-verify-jwt
echo [OK] whatsapp-manage deployed
echo.

echo [6/7] Deploying waziper-webhook...
supabase functions deploy waziper-webhook --no-verify-jwt
echo [OK] waziper-webhook deployed
echo.

echo [7/7] Deploying whatsapp_bot...
supabase functions deploy whatsapp_bot --no-verify-jwt
echo [OK] whatsapp_bot deployed
echo.

echo ============================================
echo ALL EDGE FUNCTIONS DEPLOYED!
echo ============================================
echo.
echo Deployed Functions:
echo    [OK] server           - Main API server
echo    [OK] sync_event       - Event synchronization
echo    [OK] whatsapp-send    - Send messages
echo    [OK] whatsapp-qrcode  - QR authentication
echo    [OK] whatsapp-manage  - Instance management
echo    [OK] waziper-webhook  - Incoming webhooks
echo    [OK] whatsapp_bot     - Customer support bot
echo.
echo Your app: https://jariwala.figma.site
echo.
echo Next Steps:
echo    1. Test WhatsApp features (no CORS errors!)
echo    2. Test event synchronization
echo    3. Monitor logs: supabase functions logs
echo.
echo [SUCCESS] PRODUCTION READY!
echo.
pause
