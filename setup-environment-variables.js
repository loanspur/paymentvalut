// Setup script to help configure environment variables
// Run this script to set up the required environment variables

const fs = require('fs');
const path = require('path');

console.log('🔧 Setting up environment variables...');

// Check if .env file exists
const envPath = path.join(__dirname, '.env');
const envExamplePath = path.join(__dirname, 'env.example');

if (fs.existsSync(envPath)) {
  console.log('✅ .env file already exists');
} else {
  console.log('📝 Creating .env file from env.example...');
  
  if (fs.existsSync(envExamplePath)) {
    // Copy env.example to .env
    const envExampleContent = fs.readFileSync(envExamplePath, 'utf8');
    fs.writeFileSync(envPath, envExampleContent);
    console.log('✅ .env file created successfully');
  } else {
    console.log('❌ env.example file not found');
    process.exit(1);
  }
}

console.log('\n📋 Next steps:');
console.log('1. Edit the .env file with your actual Supabase credentials');
console.log('2. Get your Supabase URL and keys from: https://app.supabase.com/project/YOUR_PROJECT/settings/api');
console.log('3. Set a secure JWT_SECRET (you can generate one with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))")');
console.log('4. Restart your development server: npm run dev');
console.log('\n🔑 Required environment variables:');
console.log('- NEXT_PUBLIC_SUPABASE_URL');
console.log('- NEXT_PUBLIC_SUPABASE_ANON_KEY');
console.log('- SUPABASE_SERVICE_ROLE_KEY');
console.log('- JWT_SECRET');
console.log('\n⚠️  Make sure to never commit the .env file to version control!');
