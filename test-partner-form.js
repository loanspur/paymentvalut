// Test partner form data persistence
const https = require('https')

async function testPartnerForm() {
  console.log('🔍 Testing Partner Form Data Persistence')
  console.log('=========================================')
  console.log('')
  
  // Test data for a partner with Mifos X configuration
  const testPartner = {
    name: 'Test Mifos Partner 2',
    short_code: 'TMP002',
    mpesa_shortcode: '174380',
    mpesa_consumer_key: 'test_consumer_key',
    mpesa_consumer_secret: 'test_consumer_secret',
    mpesa_passkey: 'test_passkey',
    mpesa_initiator_name: 'test_initiator',
    mpesa_initiator_password: 'test_password',
    security_credential: 'test_security',
    mpesa_environment: 'sandbox',
    is_active: true,
    is_mpesa_configured: true,
    api_key: 'test_api_key_123',
    allowed_ips: ['192.168.1.1'],
    ip_whitelist_enabled: true,
    // Mifos X configuration
    mifos_host_url: 'https://test-mifos.example.com',
    mifos_username: 'test_user',
    mifos_password: 'test_password',
    mifos_tenant_id: 'test_tenant',
    mifos_api_endpoint: '/fineract-provider/api/v1',
    mifos_webhook_url: 'https://paymentvalut-ju.vercel.app/api/mifos/webhook/loan-approval',
    mifos_webhook_secret_token: 'test_webhook_secret',
    is_mifos_configured: true,
    mifos_auto_disbursement_enabled: true,
    mifos_max_disbursement_amount: 50000,
    mifos_min_disbursement_amount: 1000
  }
  
  console.log('📋 Test Partner Data:')
  console.log(JSON.stringify(testPartner, null, 2))
  console.log('')
  
  // Test creating a partner
  console.log('📡 Testing partner creation...')
  
  try {
    const createUrl = 'https://paymentvalut-ju.vercel.app/api/partners/create-with-vault'
    
    const url = new URL(createUrl)
    const options = {
      hostname: url.hostname,
      port: url.port || 443,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Partner-Test/1.0'
      }
    }

    const response = await new Promise((resolve, reject) => {
      const req = https.request(options, (res) => {
        console.log(`   Status: ${res.statusCode}`)
        
        let data = ''
        res.on('data', (chunk) => {
          data += chunk
        })
        
        res.on('end', () => {
          try {
            const responseData = JSON.parse(data)
            console.log(`   Response: ${JSON.stringify(responseData, null, 2)}`)
            resolve({ status: res.statusCode, data: responseData })
          } catch (e) {
            console.log(`   Raw Response: ${data}`)
            resolve({ status: res.statusCode, data })
          }
        })
      })

      req.on('error', (error) => {
        console.error(`   ❌ Error: ${error.message}`)
        reject(error)
      })

      req.write(JSON.stringify(testPartner))
      req.end()
    })

    console.log('')
    console.log('🔍 Creation Result:')
    console.log('===================')
    
    if (response.status === 200 || response.status === 201) {
      console.log('✅ Partner created successfully')
      
      if (response.data && response.data.partner) {
        const partner = response.data.partner
        console.log('')
        console.log('📋 Created Partner Data:')
        console.log(`   Name: ${partner.name}`)
        console.log(`   Short Code: ${partner.short_code}`)
        console.log(`   Mifos Host: ${partner.mifos_host_url}`)
        console.log(`   Mifos Username: ${partner.mifos_username}`)
        console.log(`   Mifos Configured: ${partner.is_mifos_configured}`)
        console.log(`   Auto Disbursement: ${partner.mifos_auto_disbursement_enabled}`)
        console.log(`   Max Amount: ${partner.mifos_max_disbursement_amount}`)
        console.log(`   Min Amount: ${partner.mifos_min_disbursement_amount}`)
        
        // Test updating the partner
        if (partner.id) {
          console.log('')
          console.log('📡 Testing partner update...')
          
          const updateData = {
            ...testPartner,
            name: 'Updated Test Mifos Partner',
            mifos_max_disbursement_amount: 75000,
            mifos_min_disbursement_amount: 2000
          }
          
          const updateUrl = `https://paymentvalut-ju.vercel.app/api/partners/update-with-vault/${partner.id}`
          
          const updateOptions = {
            hostname: url.hostname,
            port: url.port || 443,
            path: `/api/partners/update-with-vault/${partner.id}`,
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'User-Agent': 'Partner-Test/1.0'
            }
          }

          const updateResponse = await new Promise((resolve, reject) => {
            const updateReq = https.request(updateOptions, (res) => {
              console.log(`   Update Status: ${res.statusCode}`)
              
              let data = ''
              res.on('data', (chunk) => {
                data += chunk
              })
              
              res.on('end', () => {
                try {
                  const responseData = JSON.parse(data)
                  console.log(`   Update Response: ${JSON.stringify(responseData, null, 2)}`)
                  resolve({ status: res.statusCode, data: responseData })
                } catch (e) {
                  console.log(`   Raw Update Response: ${data}`)
                  resolve({ status: res.statusCode, data })
                }
              })
            })

            updateReq.on('error', (error) => {
              console.error(`   ❌ Update Error: ${error.message}`)
              reject(error)
            })

            updateReq.write(JSON.stringify(updateData))
            updateReq.end()
          })

          console.log('')
          console.log('🔍 Update Result:')
          console.log('=================')
          
          if (updateResponse.status === 200) {
            console.log('✅ Partner updated successfully')
            
            if (updateResponse.data && updateResponse.data.partner) {
              const updatedPartner = updateResponse.data.partner
              console.log('')
              console.log('📋 Updated Partner Data:')
              console.log(`   Name: ${updatedPartner.name}`)
              console.log(`   Max Amount: ${updatedPartner.mifos_max_disbursement_amount}`)
              console.log(`   Min Amount: ${updatedPartner.mifos_min_disbursement_amount}`)
            }
          } else {
            console.log('❌ Partner update failed')
          }
        }
      }
    } else {
      console.log('❌ Partner creation failed')
    }

  } catch (error) {
    console.error(`❌ Test failed: ${error.message}`)
  }
  
  console.log('')
  console.log('📋 Test Summary:')
  console.log('================')
  console.log('1. Test partner creation with Mifos X data')
  console.log('2. Test partner update with Mifos X data')
  console.log('3. Verify data persistence in database')
  console.log('4. Check if form resets properly after save')
}

testPartnerForm()
