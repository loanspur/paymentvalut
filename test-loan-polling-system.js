// Test the loan polling system
const https = require('https')

const baseUrl = 'https://paymentvalut-ju.vercel.app'

async function testLoanPollingSystem() {
  console.log('🧪 Testing Loan Polling System')
  console.log('=' .repeat(60))
  console.log('')

  // Test 1: Fetch pending loans
  console.log('📋 Test 1: Fetching pending loans from Mifos X...')
  try {
    const fetchResult = await makeRequest(`${baseUrl}/api/mifos/fetch-pending-loans`, 'POST')
    console.log('✅ Fetch Results:', fetchResult.message)
    console.log('   Total processed loans:', fetchResult.totalProcessedLoans)
    if (fetchResult.results) {
      fetchResult.results.forEach(result => {
        console.log(`   - ${result.partner}: ${result.processedLoans} loans processed`)
      })
    }
  } catch (error) {
    console.log('❌ Fetch failed:', error.message)
  }

  console.log('')

  // Test 2: Process pending loans
  console.log('📋 Test 2: Processing pending loans for disbursement...')
  try {
    const processResult = await makeRequest(`${baseUrl}/api/mifos/process-pending-loans`, 'POST')
    console.log('✅ Process Results:', processResult.message)
    console.log('   Processed loans:', processResult.processedLoans)
    if (processResult.results) {
      processResult.results.forEach(result => {
        console.log(`   - Loan ${result.loanId}: ${result.status}`)
        if (result.error) {
          console.log(`     Error: ${result.error}`)
        }
      })
    }
  } catch (error) {
    console.log('❌ Process failed:', error.message)
  }

  console.log('')

  // Test 3: Full scheduled sync
  console.log('📋 Test 3: Running full scheduled sync...')
  try {
    const syncResult = await makeRequest(`${baseUrl}/api/mifos/scheduled-loan-sync`, 'POST')
    console.log('✅ Sync Results:', syncResult.summary.message)
    console.log('   Fetch success:', syncResult.summary.fetchSuccess)
    console.log('   Process success:', syncResult.summary.processSuccess)
    console.log('   Total fetched:', syncResult.summary.totalFetched)
    console.log('   Total processed:', syncResult.summary.totalProcessed)
  } catch (error) {
    console.log('❌ Sync failed:', error.message)
  }

  console.log('')
  console.log('🎯 Next Steps:')
  console.log('1. Check loan tracking dashboard for new records')
  console.log('2. Set up cron job to run scheduled sync every 5 minutes')
  console.log('3. Monitor disbursement records for processed loans')
}

function makeRequest(url, method = 'GET', data = null) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url)
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || 443,
      path: urlObj.pathname + urlObj.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Loan-Polling-Test/1.0'
      }
    }

    if (data) {
      const postData = JSON.stringify(data)
      options.headers['Content-Length'] = Buffer.byteLength(postData)
    }

    const req = https.request(options, (res) => {
      let responseData = ''
      res.on('data', (chunk) => {
        responseData += chunk
      })
      res.on('end', () => {
        try {
          const parsed = JSON.parse(responseData)
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(parsed)
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${parsed.error || responseData}`))
          }
        } catch (parseError) {
          reject(new Error(`Parse error: ${parseError.message}`))
        }
      })
    })

    req.on('error', (error) => {
      reject(error)
    })

    if (data) {
      req.write(JSON.stringify(data))
    }
    req.end()
  })
}

testLoanPollingSystem()
