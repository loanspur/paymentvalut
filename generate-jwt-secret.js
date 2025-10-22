// Generate a secure JWT secret for Vercel deployment
const crypto = require('crypto')

console.log('🔐 Generating Secure JWT Secret for Vercel')
console.log('==========================================')
console.log('')

// Generate a secure random secret
const jwtSecret = crypto.randomBytes(64).toString('hex')

console.log('📋 Your JWT Secret:')
console.log(jwtSecret)
console.log('')
console.log('📋 Instructions:')
console.log('1. Copy the secret above')
console.log('2. Go to Vercel Dashboard → Your Project → Settings → Environment Variables')
console.log('3. Add new environment variable:')
console.log('   - Name: JWT_SECRET')
console.log('   - Value: [paste the secret above]')
console.log('   - Environment: Production')
console.log('4. Save and redeploy your application')
console.log('')
console.log('⚠️  Important:')
console.log('- Keep this secret secure and private')
console.log('- Use the same secret across all environments')
console.log('- Never commit this to your repository')
