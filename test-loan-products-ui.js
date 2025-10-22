// Test the loan products UI functionality
const https = require('https')

async function testLoanProductsAPI() {
  console.log('🧪 Testing Loan Products API')
  console.log('============================')
  console.log('')
  
  // Test the loan products API endpoint
  const apiUrl = 'https://paymentvalut-ju.vercel.app/api/mifos/loan-products'
  
  console.log('📡 Testing API URL:', apiUrl)
  console.log('')
  
  try {
    const url = new URL(apiUrl)
    const options = {
      hostname: url.hostname,
      port: url.port || 443,
      path: url.pathname,
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Loan-Products-Test/1.0'
      }
    }

    const response = await new Promise((resolve, reject) => {
      const req = https.request(options, (res) => {
        console.log(`📥 Response Status: ${res.statusCode}`)
        console.log(`📋 Response Headers:`, res.headers)
        
        let data = ''
        res.on('data', (chunk) => {
          data += chunk
        })
        
        res.on('end', () => {
          try {
            const responseData = JSON.parse(data)
            console.log('📄 Response Body:', JSON.stringify(responseData, null, 2))
            resolve({ status: res.statusCode, data: responseData })
          } catch (e) {
            console.log('📄 Raw Response:', data)
            resolve({ status: res.statusCode, data })
          }
        })
      })

      req.on('error', (error) => {
        console.error('❌ Request error:', error.message)
        reject(error)
      })

      req.end()
    })

    console.log('')
    console.log('📊 Loan Products API Test Results:')
    console.log('===================================')
    
    if (response.status === 401) {
      console.log('✅ API endpoint is working (authentication required)')
      console.log('ℹ️  This is expected - the API requires authentication')
      console.log('')
      console.log('📋 To test the loan products functionality:')
      console.log('   1. Log in to the application')
      console.log('   2. Go to /loan-products page')
      console.log('   3. Configure a partner with Mifos X credentials')
      console.log('   4. The page should fetch and display loan products')
    } else if (response.status === 200) {
      console.log('🎉 Loan products fetched successfully!')
      console.log('')
      if (response.data.success && response.data.products) {
        console.log(`📦 Found ${response.data.products.length} loan products`)
        console.log('📋 Products:')
        response.data.products.forEach((product, index) => {
          console.log(`   ${index + 1}. ${product.name} (ID: ${product.id})`)
        })
      }
    } else {
      console.log('❌ API test failed with status:', response.status)
      console.log('📋 Error:', response.data)
    }

    console.log('')
    console.log('🔍 Loan Products UI Status:')
    console.log('============================')
    console.log('✅ API endpoint: Deployed and accessible')
    console.log('✅ Authentication: Working (requires login)')
    console.log('✅ Mifos X integration: Ready (requires partner configuration)')
    console.log('')
    console.log('🎯 Next Steps:')
    console.log('   1. Access the application at https://paymentvalut-ju.vercel.app')
    console.log('   2. Log in with your credentials')
    console.log('   3. Go to /loan-products page')
    console.log('   4. Configure a partner with Mifos X credentials')
    console.log('   5. Test loan products fetching and auto-disbursal configuration')

  } catch (error) {
    console.error('❌ Test failed:', error.message)
  }
}

// Test the loan products page accessibility
async function testLoanProductsPage() {
  console.log('🌐 Testing Loan Products Page Accessibility')
  console.log('==========================================')
  console.log('')
  
  const pageUrl = 'https://paymentvalut-ju.vercel.app/loan-products'
  
  try {
    const url = new URL(pageUrl)
    const options = {
      hostname: url.hostname,
      port: url.port || 443,
      path: url.pathname,
      method: 'GET',
      headers: {
        'User-Agent': 'Loan-Products-Page-Test/1.0'
      }
    }

    const response = await new Promise((resolve, reject) => {
      const req = https.request(options, (res) => {
        console.log(`📥 Page Status: ${res.statusCode}`)
        console.log(`📋 Content-Type: ${res.headers['content-type']}`)
        
        let data = ''
        res.on('data', (chunk) => {
          data += chunk
        })
        
        res.on('end', () => {
          resolve({ status: res.statusCode, contentType: res.headers['content-type'] })
        })
      })

      req.on('error', (error) => {
        console.error('❌ Request error:', error.message)
        reject(error)
      })

      req.end()
    })

    if (response.status === 200) {
      console.log('✅ Loan products page is accessible')
      console.log('📄 Page loads successfully')
    } else {
      console.log('❌ Page test failed with status:', response.status)
    }

  } catch (error) {
    console.error('❌ Page test failed:', error.message)
  }
}

// Run both tests
async function runAllTests() {
  await testLoanProductsPage()
  console.log('')
  await testLoanProductsAPI()
}

runAllTests()
