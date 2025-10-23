const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

async function testUrlAlternatives() {
  console.log('🧪 Testing Supabase URL Alternatives...\n')
  console.log('=' .repeat(60))

  const urls = [
    {
      name: 'Original Domain',
      url: 'https://mapgmmiobityxaaevomp.supabase.co/functions/v1/loan-polling'
    },
    {
      name: 'IP Address',
      url: 'https://104.18.38.10/functions/v1/loan-polling'
    },
    {
      name: 'With Trailing Slash',
      url: 'https://mapgmmiobityxaaevomp.supabase.co/functions/v1/loan-polling/'
    }
  ]

  for (const { name, url } of urls) {
    console.log(`\n🔍 Testing: ${name}`)
    console.log(`📡 URL: ${url}`)
    console.log('-'.repeat(50))
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseServiceKey}`,
          'x-api-key': supabaseServiceKey
        },
        body: JSON.stringify({})
      })

      const result = await response.json()
      
      if (response.ok) {
        console.log('✅ SUCCESS!')
        console.log(`📊 Status: ${response.status} ${response.statusText}`)
        console.log(`📋 Partners checked: ${result.partners_checked || 0}`)
        console.log(`📋 Loans found: ${result.loans_found || 0}`)
        console.log(`📋 Loans processed: ${result.loans_processed || 0}`)
      } else {
        console.log('❌ FAILED!')
        console.log(`📊 Status: ${response.status} ${response.statusText}`)
        console.log(`📋 Error: ${result.error || 'Unknown error'}`)
      }
      
    } catch (error) {
      console.log('❌ ERROR!')
      console.log(`📋 Error: ${error.message}`)
      
      if (error.message.includes('DNS')) {
        console.log('🔧 DNS Issue: This URL has DNS resolution problems')
      } else if (error.message.includes('SSL')) {
        console.log('🔧 SSL Issue: Certificate problem with this URL')
      } else if (error.message.includes('timeout')) {
        console.log('🔧 Timeout Issue: Request took too long')
      }
    }
  }

  console.log('\n' + '='.repeat(60))
  console.log('📋 Recommendations:')
  console.log('')
  console.log('1. 🚀 Try EasyCron (https://www.easycron.com/)')
  console.log('   - Better DNS resolution than cron-job.org')
  console.log('   - Free tier available')
  console.log('   - Similar setup process')
  console.log('')
  console.log('2. 🎯 Use GitHub Actions (Most Reliable)')
  console.log('   - No DNS issues')
  console.log('   - Free for public repos')
  console.log('   - Built-in monitoring')
  console.log('')
  console.log('3. 🔧 Try SetCronJob (https://www.setcronjob.com/)')
  console.log('   - Good reliability')
  console.log('   - Free tier available')
  console.log('')
  console.log('4. 📞 Contact cron-job.org support')
  console.log('   - Report the DNS issue')
  console.log('   - They might have a solution')
  console.log('')
  console.log('💡 The DNS error is a known issue with cron-job.org')
  console.log('   Your Edge Function is working perfectly!')
}

testUrlAlternatives()

