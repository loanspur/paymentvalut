// Test script to verify SMS system functionality
// Run this script to test the SMS system after migration

require('dotenv').config()
const https = require('https')
const http = require('http')

function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http
    
    const req = client.request(url, {
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    }, (res) => {
      let data = ''
      res.on('data', chunk => data += chunk)
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data)
          resolve({
            ok: res.statusCode >= 200 && res.statusCode < 300,
            status: res.statusCode,
            json: () => Promise.resolve(jsonData)
          })
        } catch (error) {
          resolve({
            ok: false,
            status: res.statusCode,
            json: () => Promise.resolve({ error: 'Invalid JSON response' })
          })
        }
      })
    })
    
    req.on('error', reject)
    
    if (options.body) {
      req.write(options.body)
    }
    
    req.end()
  })
}

async function testSMSSystem() {
  console.log('🧪 Testing SMS System')
  console.log('====================\n')

  try {
    // Test 1: Check if SMS tables exist
    console.log('📋 Test 1: Checking SMS database tables...')
    
    const tablesResponse = await makeRequest('http://localhost:3000/api/admin/sms/settings', {
      method: 'GET'
    })

    console.log(`   Response Status: ${tablesResponse.status}`)
    
    if (tablesResponse.ok) {
      const data = await tablesResponse.json()
      console.log('✅ SMS settings API is working')
      console.log(`   Found ${data.data?.length || 0} SMS settings`)
    } else {
      console.log('❌ SMS settings API failed')
      const errorData = await tablesResponse.json()
      console.log(`   Error: ${errorData.error}`)
    }

    // Test 2: Check SMS templates
    console.log('\n📋 Test 2: Checking SMS templates...')
    
    const templatesResponse = await makeRequest('http://localhost:3000/api/admin/sms/templates', {
      method: 'GET'
    })

    console.log(`   Response Status: ${templatesResponse.status}`)
    
    if (templatesResponse.ok) {
      const data = await templatesResponse.json()
      console.log('✅ SMS templates API is working')
      console.log(`   Found ${data.data?.length || 0} SMS templates`)
      
      if (data.data?.length > 0) {
        const template = data.data[0]
        console.log(`   Sample template: ${template.template_name} (${template.template_type})`)
        console.log(`   Variables: ${template.variables?.join(', ') || 'None'}`)
      }
    } else {
      console.log('❌ SMS templates API failed')
      const errorData = await templatesResponse.json()
      console.log(`   Error: ${errorData.error}`)
    }

    // Test 3: Check partners for SMS setup
    console.log('\n📋 Test 3: Checking partners for SMS setup...')
    
    const partnersResponse = await makeRequest('http://localhost:3000/api/partners', {
      method: 'GET'
    })

    if (partnersResponse.ok) {
      const data = await partnersResponse.json()
      console.log('✅ Partners API is working')
      console.log(`   Found ${data.partners?.length || 0} partners`)
      
      if (data.partners?.length > 0) {
        const activePartners = data.partners.filter(p => p.is_active)
        console.log(`   Active partners: ${activePartners.length}`)
        
        if (activePartners.length > 0) {
          const partner = activePartners[0]
          console.log(`   Sample partner: ${partner.name} (${partner.short_code})`)
        }
      }
    } else {
      console.log('❌ Partners API failed')
    }

    console.log('\n🎉 SMS System Test Completed!')
    console.log('\n📝 Next Steps:')
    console.log('1. Run the migration: fix-sms-schema-migration.sql')
    console.log('2. Access admin pages: /admin/sms-settings and /admin/sms-templates')
    console.log('3. Configure SMS settings for partners')
    console.log('4. Create SMS templates')
    console.log('5. Test SMS sending functionality')

  } catch (error) {
    console.error('❌ Test failed:', error.message)
  }
}

// Run the test
testSMSSystem()
