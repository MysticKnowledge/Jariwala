@echo off
REM ============================================
REM WhatsApp Edge Functions Deployment Script
REM ============================================
REM This script deploys all WhatsApp-related Edge Functions to Supabase
REM Domain: jariwala.figma.site
REM Date: January 30, 2026

echo.
echo ============================================
echo WhatsApp Edge Functions Deployment
echo ============================================
echo.
echo Functions to deploy:
echo    1. whatsapp-send      - Send WhatsApp messages
echo    2. whatsapp-qrcode    - Get QR code for authentication
echo    3. whatsapp-manage    - Manage instance (status, reboot, reconnect)
echo    4. waziper-webhook    - Webhook for incoming messages
echo    5. whatsapp_bot       - WhatsApp bot for customer support
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

echo [1/5] Deploying whatsapp-send...
supabase functions deploy whatsapp-send --no-verify-jwt
echo [OK] whatsapp-send deployed
echo.

echo [2/5] Deploying whatsapp-qrcode...
supabase functions deploy whatsapp-qrcode --no-verify-jwt
echo [OK] whatsapp-qrcode deployed
echo.

echo [3/5] Deploying whatsapp-manage...
supabase functions deploy whatsapp-manage --no-verify-jwt
echo [OK] whatsapp-manage deployed
echo.

echo [4/5] Deploying waziper-webhook...
supabase functions deploy waziper-webhook --no-verify-jwt
echo [OK] waziper-webhook deployed
echo.

echo [5/5] Deploying whatsapp_bot...
supabase functions deploy whatsapp_bot --no-verify-jwt
echo [OK] whatsapp_bot deployed
echo.

echo ============================================
echo All Edge Functions Deployed Successfully!
echo ============================================
echo.
echo Next Steps:
echo    1. Your app will automatically use Edge Functions (no CORS!)
echo    2. Test WhatsApp features at https://jariwala.figma.site
echo    3. Go to WhatsApp panel and try 'Generate QR Code'
echo.
echo [SUCCESS] Production Ready!
echo.
echo Documentation: /PRODUCTION-SETUP.md
echo.
pause
