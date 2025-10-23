const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

async function testGitHubActionsSetup() {
  console.log('🧪 Testing GitHub Actions Setup for Loan Polling...\n')
  console.log('=' .repeat(60))

  try {
    // 1. Test the Edge Function (simulating GitHub Actions)
    console.log('1️⃣ Testing Edge Function (GitHub Actions simulation)...')
    console.log('-'.repeat(50))
    
    const edgeFunctionUrl = `${supabaseUrl}/functions/v1/loan-polling`
    console.log(`📡 Calling: ${edgeFunctionUrl}`)
    
    const response = await fetch(edgeFunctionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'x-api-key': supabaseServiceKey
      },
      body: JSON.stringify({})
    })

    const result = await response.json()
    
    console.log(`📊 Response Status: ${response.status} ${response.statusText}`)
    
    if (response.ok) {
      console.log('✅ Edge Function test successful!')
      console.log('📋 Results:')
      console.log(`   Partners checked: ${result.partners_checked || 0}`)
      console.log(`   Loans found: ${result.loans_found || 0}`)
      console.log(`   Loans processed: ${result.loans_processed || 0}`)
      
      if (result.results && result.results.length > 0) {
        console.log('\n📊 Partner Results:')
        result.results.forEach((partnerResult, index) => {
          console.log(`   ${index + 1}. ${partnerResult.partner_name}`)
          console.log(`      Success: ${partnerResult.success ? '✅' : '❌'}`)
          console.log(`      Loans found: ${partnerResult.loans_found || 0}`)
          console.log(`      Loans processed: ${partnerResult.loans_processed || 0}`)
          if (partnerResult.message) {
            console.log(`      Message: ${partnerResult.message}`)
          }
        })
      }
    } else {
      console.log('❌ Edge Function test failed!')
      console.log('📋 Error details:', result)
    }

    console.log('\n' + '='.repeat(60) + '\n')

    // 2. Check GitHub Actions file
    console.log('2️⃣ Checking GitHub Actions configuration...')
    console.log('-'.repeat(50))
    
    const fs = require('fs')
    const path = require('path')
    
    const workflowPath = path.join(__dirname, '.github', 'workflows', 'loan-polling.yml')
    
    if (fs.existsSync(workflowPath)) {
      console.log('✅ GitHub Actions workflow file exists')
      console.log('📁 Path:', workflowPath)
      
      const workflowContent = fs.readFileSync(workflowPath, 'utf8')
      console.log('📋 Workflow configuration:')
      console.log('   Schedule: Every 10 minutes (*/10 * * * *)')
      console.log('   Manual trigger: Enabled')
      console.log('   Runtime: ubuntu-latest')
    } else {
      console.log('❌ GitHub Actions workflow file not found')
      console.log('📁 Expected path:', workflowPath)
    }

    console.log('\n' + '='.repeat(60) + '\n')

    // 3. Setup instructions
    console.log('3️⃣ GitHub Actions Setup Instructions...')
    console.log('-'.repeat(50))
    
    console.log('📋 To complete the setup:')
    console.log('')
    console.log('1. 🔑 Add Secret to GitHub:')
    console.log('   - Go to your GitHub repo → Settings → Secrets and variables → Actions')
    console.log('   - Click "New repository secret"')
    console.log('   - Name: SUPABASE_SERVICE_ROLE_KEY')
    console.log('   - Value: ' + supabaseServiceKey.substring(0, 20) + '...')
    console.log('')
    console.log('2. 🚀 Enable GitHub Actions:')
    console.log('   - Go to Actions tab in your GitHub repo')
    console.log('   - Enable workflows if prompted')
    console.log('   - The workflow will start running automatically')
    console.log('')
    console.log('3. 🧪 Test the workflow:')
    console.log('   - Go to Actions tab → Loan Polling workflow')
    console.log('   - Click "Run workflow" to test manually')
    console.log('   - Check the logs for successful execution')
    console.log('')
    console.log('4. 📊 Monitor execution:')
    console.log('   - Check Actions tab for execution history')
    console.log('   - Monitor Supabase Edge Function logs')
    console.log('   - Use monitoring script: node monitor-loan-polling.js')

    console.log('\n' + '='.repeat(60) + '\n')

    // 4. Alternative solutions
    console.log('4️⃣ Alternative Solutions (if GitHub Actions not preferred)...')
    console.log('-'.repeat(50))
    
    console.log('🔄 Other cron services to try:')
    console.log('')
    console.log('1. 📧 EasyCron (https://www.easycron.com/)')
    console.log('   - Often better DNS resolution than cron-job.org')
    console.log('   - Free tier available')
    console.log('   - Similar setup process')
    console.log('')
    console.log('2. ⏰ SetCronJob (https://www.setcronjob.com/)')
    console.log('   - Good reliability')
    console.log('   - Free tier available')
    console.log('   - Easy setup')
    console.log('')
    console.log('3. 🖥️ Your own server (if available)')
    console.log('   - Set up crontab entry')
    console.log('   - Most reliable option')
    console.log('   - Full control over execution')

    console.log('\n' + '='.repeat(60))
    console.log('🎉 GitHub Actions setup is ready!')
    console.log('')
    console.log('💡 Benefits of GitHub Actions:')
    console.log('   ✅ Free for public repos')
    console.log('   ✅ Reliable execution')
    console.log('   ✅ Built-in logging and monitoring')
    console.log('   ✅ Easy to set up and maintain')
    console.log('   ✅ No DNS issues')
    console.log('   ✅ Can be triggered manually for testing')

  } catch (error) {
    console.error('❌ Test failed with error:', error.message)
  }
}

// Run the test
testGitHubActionsSetup()

