#!/bin/bash

# M-Pesa B2C Disbursement System Setup Script
# This script helps set up the development environment

echo "🚀 Setting up M-Pesa B2C Disbursement System"
echo "============================================="

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js version 18+ is required. Current version: $(node -v)"
    exit 1
fi

echo "✅ Node.js $(node -v) detected"

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "⚠️  Supabase CLI is not installed."
    echo "📥 Installing Supabase CLI..."
    npm install -g supabase
fi

echo "✅ Supabase CLI $(supabase --version) detected"

# Create environment file if it doesn't exist
if [ ! -f ".env.local" ]; then
    echo "📝 Creating environment file..."
    cp env.example .env.local
    echo "✅ Created .env.local from template"
    echo "⚠️  Please update .env.local with your actual credentials"
else
    echo "✅ Environment file already exists"
fi

# Check if Supabase project is initialized
if [ ! -f "supabase/config.toml" ]; then
    echo "🔧 Initializing Supabase project..."
    supabase init
else
    echo "✅ Supabase project already initialized"
fi

echo ""
echo "🎉 Setup complete!"
echo ""
echo "📋 Next steps:"
echo "1. Update .env.local with your Supabase credentials"
echo "2. Update .env.local with your M-Pesa B2C credentials"
echo "3. Start Supabase: supabase start"
echo "4. Deploy Edge Functions: supabase functions deploy"
echo "5. Run the app: npm run dev"
echo ""
echo "🧪 Test the system:"
echo "node test-disbursement.js"
echo ""
echo "📚 For more information, see README.md"






