@echo off
REM =====================================================
REM DEPLOY SERVER FUNCTION WITH EXCEL IMPORT
REM =====================================================

echo 🚀 Deploying server function with Excel import...
echo.

REM Deploy the server function
echo 📦 Deploying server function...
supabase functions deploy server

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ✅ Server function deployed successfully!
    echo.
    echo 🎯 Endpoints available:
    echo    • /make-server-c45d1eeb/health
    echo    • /make-server-c45d1eeb/bulk-import
    echo.
    echo 📊 Test the import endpoint:
    echo    Upload an Excel file through the UI
    echo.
    echo 🎉 Excel import feature is now live!
) else (
    echo.
    echo ❌ Deployment failed!
    echo Please check your Supabase credentials and try again.
    exit /b 1
)
