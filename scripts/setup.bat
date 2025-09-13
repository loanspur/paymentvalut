@echo off
REM M-Pesa B2C Disbursement System Setup Script for Windows
REM This script helps set up the development environment

echo 🚀 Setting up M-Pesa B2C Disbursement System
echo =============================================

REM Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js is not installed. Please install Node.js 18+ first.
    pause
    exit /b 1
)

echo ✅ Node.js detected
node --version

REM Install dependencies
echo 📦 Installing dependencies...
call npm install

REM Check if Supabase CLI is installed
supabase --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ⚠️  Supabase CLI is not installed.
    echo 📥 Installing Supabase CLI...
    call npm install -g supabase
)

echo ✅ Supabase CLI detected
supabase --version

REM Create environment file if it doesn't exist
if not exist ".env.local" (
    echo 📝 Creating environment file...
    copy env.example .env.local
    echo ✅ Created .env.local from template
    echo ⚠️  Please update .env.local with your actual credentials
) else (
    echo ✅ Environment file already exists
)

REM Check if Supabase project is initialized
if not exist "supabase\config.toml" (
    echo 🔧 Initializing Supabase project...
    call supabase init
) else (
    echo ✅ Supabase project already initialized
)

echo.
echo 🎉 Setup complete!
echo.
echo 📋 Next steps:
echo 1. Update .env.local with your Supabase credentials
echo 2. Update .env.local with your M-Pesa B2C credentials
echo 3. Start Supabase: supabase start
echo 4. Deploy Edge Functions: supabase functions deploy
echo 5. Run the app: npm run dev
echo.
echo 🧪 Test the system:
echo node test-disbursement.js
echo.
echo 📚 For more information, see README.md
pause






