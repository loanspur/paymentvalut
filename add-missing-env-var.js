// Script to add missing NEXT_PUBLIC_APP_URL to .env file
// Run this script to add the missing environment variable

const fs = require('fs')
const path = require('path')

console.log('🔧 Adding Missing Environment Variable')
console.log('=====================================\n')

const envPath = path.join(__dirname, '.env')

try {
  // Check if .env file exists
  if (!fs.existsSync(envPath)) {
    console.log('❌ .env file not found')
    console.log('   Please create a .env file first')
    process.exit(1)
  }

  // Read current .env content
  const envContent = fs.readFileSync(envPath, 'utf8')
  
  // Check if NEXT_PUBLIC_APP_URL already exists
  if (envContent.includes('NEXT_PUBLIC_APP_URL')) {
    console.log('✅ NEXT_PUBLIC_APP_URL already exists in .env file')
    console.log('   No changes needed')
    process.exit(0)
  }

  // Add the missing variable
  const newEnvContent = envContent + '\n# App URL\nNEXT_PUBLIC_APP_URL=http://localhost:3000\n'
  
  // Write back to .env file
  fs.writeFileSync(envPath, newEnvContent)
  
  console.log('✅ Successfully added NEXT_PUBLIC_APP_URL to .env file')
  console.log('   Added: NEXT_PUBLIC_APP_URL=http://localhost:3000')
  
  console.log('\n📝 Next Steps:')
  console.log('1. Restart your development server: npm run dev')
  console.log('2. Test the API endpoints again')
  console.log('3. Check if the 500 errors are resolved')

} catch (error) {
  console.error('❌ Error updating .env file:', error.message)
  console.log('\n📝 Manual Steps:')
  console.log('1. Open your .env file')
  console.log('2. Add this line: NEXT_PUBLIC_APP_URL=http://localhost:3000')
  console.log('3. Save the file')
  console.log('4. Restart your development server: npm run dev')
}
