// Setup admin user for the system
const bcrypt = require('bcryptjs');

async function setupAdmin() {
  console.log('🔧 Setting up admin user...');
  
  // Generate hash for admin123
  const password = 'admin123';
  const hash = await bcrypt.hash(password, 10);
  
  console.log('Admin credentials:');
  console.log('Email: admin@mpesavault.com');
  console.log('Password: admin123');
  console.log('Hash:', hash);
  
  // Test the hash
  const isValid = await bcrypt.compare(password, hash);
  console.log('Hash verification:', isValid);
  
  console.log('\n📋 Next steps:');
  console.log('1. Run the database migration: supabase db push');
  console.log('2. The admin user will be created automatically');
  console.log('3. Login with the credentials above');
  console.log('4. Change the password immediately after first login');
}

setupAdmin().catch(console.error);
