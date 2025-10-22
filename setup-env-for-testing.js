// Setup environment variables for testing
const fs = require('fs')
const path = require('path')

console.log('🔧 Setting up environment variables for testing...')
console.log('')

// Check if .env.local exists
const envPath = path.join(__dirname, '.env.local')
const envExists = fs.existsSync(envPath)

if (envExists) {
  console.log('✅ .env.local file already exists')
  console.log('📝 Current .env.local contents:')
  console.log('─' .repeat(50))
  
  try {
    const envContent = fs.readFileSync(envPath, 'utf8')
    console.log(envContent)
  } catch (error) {
    console.error('❌ Error reading .env.local:', error.message)
  }
} else {
  console.log('❌ .env.local file does not exist')
  console.log('')
  console.log('🔧 To create .env.local file, you need to:')
  console.log('')
  console.log('1. Get your Supabase credentials from:')
  console.log('   - Go to https://supabase.com/dashboard')
  console.log('   - Select your project')
  console.log('   - Go to Settings → API')
  console.log('   - Copy the Project URL and service_role key')
  console.log('')
  console.log('2. Create .env.local file with:')
  console.log('')
  console.log('NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co')
  console.log('NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key')
  console.log('SUPABASE_SERVICE_ROLE_KEY=your-service-role-key')
  console.log('')
  console.log('3. Or run this command to create it:')
  console.log('   copy env.example .env.local')
  console.log('   Then edit .env.local with your actual credentials')
}

console.log('')
console.log('🚀 Alternative: Set environment variables in terminal')
console.log('')
console.log('You can also set them temporarily in your terminal:')
console.log('')
console.log('Windows (PowerShell):')
console.log('$env:NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"')
console.log('$env:SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"')
console.log('')
console.log('Windows (Command Prompt):')
console.log('set NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co')
console.log('set SUPABASE_SERVICE_ROLE_KEY=your-service-role-key')
console.log('')
console.log('Then run: node test-supabase-connection.js')
