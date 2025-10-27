const fs = require('fs')
const path = require('path')

// Configuration
const OLD_DOMAIN = 'your-vercel-app.vercel.app' // Replace with your actual Vercel domain
const NEW_DOMAIN = 'eazzypay.online'
const NEW_URL = `https://${NEW_DOMAIN}`

console.log('🌐 Updating Domain Configuration...')
console.log('=' .repeat(50))
console.log(`📝 Old Domain: ${OLD_DOMAIN}`)
console.log(`📝 New Domain: ${NEW_DOMAIN}`)
console.log(`📝 New URL: ${NEW_URL}`)
console.log('')

// Files to check and update
const filesToCheck = [
  'app/api/ncba/paybill-notification/route.ts',
  'app/api/mifos/webhook/loan-approval/route.ts',
  'app/api/cron/loan-polling/route.ts',
  'app/api/cron/disburse-retry/route.ts',
  'supabase/functions/disburse/index.ts',
  'supabase/functions/disburse-retry/index.ts',
  'supabase/functions/loan-polling/index.ts',
  '.env.example',
  'README.md'
]

// Patterns to search for
const patterns = [
  {
    pattern: /https:\/\/[a-zA-Z0-9-]+\.vercel\.app/g,
    replacement: NEW_URL,
    description: 'Vercel app URLs'
  },
  {
    pattern: /your-vercel-app\.vercel\.app/g,
    replacement: NEW_DOMAIN,
    description: 'Placeholder Vercel domain'
  },
  {
    pattern: /localhost:3000/g,
    replacement: NEW_DOMAIN,
    description: 'Localhost references'
  }
]

let totalUpdates = 0

filesToCheck.forEach(filePath => {
  if (fs.existsSync(filePath)) {
    console.log(`📁 Checking: ${filePath}`)
    
    try {
      let content = fs.readFileSync(filePath, 'utf8')
      let fileUpdates = 0
      
      patterns.forEach(({ pattern, replacement, description }) => {
        const matches = content.match(pattern)
        if (matches) {
          console.log(`   🔄 Found ${matches.length} ${description}`)
          content = content.replace(pattern, replacement)
          fileUpdates += matches.length
        }
      })
      
      if (fileUpdates > 0) {
        fs.writeFileSync(filePath, content, 'utf8')
        console.log(`   ✅ Updated ${fileUpdates} occurrences`)
        totalUpdates += fileUpdates
      } else {
        console.log(`   ⏭️ No updates needed`)
      }
      
    } catch (error) {
      console.log(`   ❌ Error reading file: ${error.message}`)
    }
  } else {
    console.log(`📁 Skipping: ${filePath} (not found)`)
  }
  
  console.log('')
})

console.log('=' .repeat(50))
console.log(`🎉 Domain update completed!`)
console.log(`📊 Total updates: ${totalUpdates}`)
console.log('')

console.log('📋 Next Steps:')
console.log('1. 🔧 Update Vercel environment variables:')
console.log(`   NEXT_PUBLIC_APP_URL=${NEW_URL}`)
console.log(`   NEXT_PUBLIC_APP_DOMAIN=${NEW_DOMAIN}`)
console.log('')
console.log('2. 🌐 Add domain to Vercel:')
console.log('   - Go to Vercel Dashboard → Settings → Domains')
console.log(`   - Add domain: ${NEW_DOMAIN}`)
console.log('   - Configure DNS records as provided by Vercel')
console.log('')
console.log('3. 🔐 Update Supabase allowed origins:')
console.log('   - Go to Supabase Dashboard → Settings → API')
console.log(`   - Add: ${NEW_URL}`)
console.log(`   - Add: https://www.${NEW_DOMAIN}`)
console.log('')
console.log('4. 🚀 Deploy to Vercel:')
console.log('   vercel --prod')
console.log('')
console.log('5. 🧪 Test the new domain:')
console.log(`   - Visit: ${NEW_URL}`)
console.log('   - Test all functionality')
console.log('   - Verify SSL certificate')
console.log('')
console.log('6. 📧 Update external service configurations:')
console.log('   - Mifos X webhook URLs')
console.log('   - NCBA callback URLs')
console.log('   - Any other external integrations')
console.log('')
console.log('🎯 Your Payment Vault will be accessible at:')
console.log(`   ${NEW_URL}`)
console.log('')
console.log('⚠️ Important Notes:')
console.log('- DNS propagation can take 24-48 hours')
console.log('- SSL certificate will be automatically provisioned')
console.log('- Test all functionality after domain change')
console.log('- Update any hardcoded URLs in external services')






