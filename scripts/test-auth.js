// Test authentication system and create proper admin user
const bcrypt = require('bcryptjs');

async function testAuth() {
  console.log('🔍 Testing authentication system...');
  
  // Test password hashing
  const password = 'admin123';
  const hash = await bcrypt.hash(password, 10);
  
  console.log('Password:', password);
  console.log('Generated Hash:', hash);
  
  // Test password verification
  const isValid = await bcrypt.compare(password, hash);
  console.log('Password verification:', isValid);
  
  // Test with the hash from migration
  const migrationHash = '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi';
  const isValidMigration = await bcrypt.compare(password, migrationHash);
  console.log('Migration hash verification:', isValidMigration);
  
  // Generate a new hash for admin123
  const newHash = await bcrypt.hash('admin123', 10);
  console.log('New hash for admin123:', newHash);
}

testAuth().catch(console.error);
