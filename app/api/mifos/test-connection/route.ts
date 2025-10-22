import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyJWTToken } from '../../../../lib/jwt-utils'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const token = request.cookies.get('auth_token')?.value
    if (!token) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const payload = await verifyJWTToken(token)
    if (!payload) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 })
    }

    const requestBody = await request.json()
    console.log('Received request body:', requestBody)
    
    const { host_url, username, password, tenant_id, api_endpoint } = requestBody

    // Validate required fields
    if (!host_url || !username || !password || !tenant_id) {
      console.log('Validation failed - missing fields:', {
        host_url: !!host_url,
        username: !!username,
        password: !!password,
        tenant_id: !!tenant_id
      })
      return NextResponse.json({
        error: 'All Mifos X connection fields are required. Please fill in: Host URL (e.g., https://system.loanspur.com), Username (e.g., admin), Password (e.g., your_password), Tenant ID (e.g., umoja)'
      }, { status: 400 })
    }

    // Validate host URL format
    try {
      new URL(host_url)
    } catch (error) {
      return NextResponse.json({
        error: 'Invalid Host URL format. Please use a valid URL (e.g., https://system.loanspur.com)'
      }, { status: 400 })
    }

    // Log the connection attempt for debugging
    console.log('Testing Mifos X connection:', {
      hostUrl: host_url,
      username: username,
      tenantId: tenant_id,
      apiEndpoint: api_endpoint || '/fineract-provider/api/v1'
    })

    // Test Mifos X connection
    const testResult = await testMifosConnection({
      hostUrl: host_url,
      username: username,
      password: password,
      tenantId: tenant_id,
      apiEndpoint: api_endpoint || '/fineract-provider/api/v1'
    })

    if (testResult.success) {
      return NextResponse.json({
        success: true,
        message: 'Mifos X connection successful',
        systemInfo: testResult.systemInfo
      })
    } else {
      return NextResponse.json({
        success: false,
        error: testResult.error
      }, { status: 400 })
    }

  } catch (error) {
    console.error('Mifos connection test error:', error)
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

async function testMifosConnection(config: {
  hostUrl: string
  username: string
  password: string
  tenantId: string
  apiEndpoint: string
}): Promise<{ success: boolean; error?: string; systemInfo?: any }> {
  try {
    // Step 1: Test authentication
    const authUrl = `${config.hostUrl}${config.apiEndpoint}/authentication`
    console.log('Attempting authentication at:', authUrl)
    
          // Use JSON body authentication (correct Mifos X method)
          const requestBody = {
            username: config.username,
            password: config.password
          }
          
          console.log('Sending authentication request to:', authUrl)
          console.log('Request headers:', {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Fineract-Platform-TenantId': config.tenantId
          })
          console.log('Request body:', requestBody)
          
          const authResponse = await fetch(authUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json',
              'Fineract-Platform-TenantId': config.tenantId
            },
            body: JSON.stringify(requestBody)
          })
    
    console.log('Authentication response status:', authResponse.status)
    console.log('Authentication response headers:', Object.fromEntries(authResponse.headers.entries()))

    if (!authResponse.ok) {
      console.log('Authentication endpoint failed, but trying loan products with Basic Auth...')
      
      // Even if authentication endpoint fails, try loan products with Basic Auth
      const loanProductsUrl = `${config.hostUrl}${config.apiEndpoint}/loanproducts`
      const basicAuth = Buffer.from(`${config.username}:${config.password}`).toString('base64')
      
      const loanProductsResponse = await fetch(loanProductsUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Fineract-Platform-TenantId': config.tenantId,
          'Authorization': `Basic ${basicAuth}`
        }
      })

      if (loanProductsResponse.ok) {
        const loanProducts = await loanProductsResponse.json()
        const loanProductsCount = Array.isArray(loanProducts) ? loanProducts.length : 0
        
        return {
          success: true,
          systemInfo: {
            message: 'Mifos X integration working (Basic Auth for loan products)',
            loanProductsCount,
            apiEndpoint: config.apiEndpoint,
            tenantId: config.tenantId,
            note: 'Authentication endpoint not available, but loan products accessible'
          }
        }
      } else {
        const errorBody = await authResponse.text()
        return {
          success: false,
          error: `Both authentication and loan products failed. Authentication: ${authResponse.status}, Loan Products: ${loanProductsResponse.status}. Server response: ${errorBody}`
        }
      }
    }

          // Parse the authentication response to get the auth key
          const authData = await authResponse.json()
          console.log('Authentication successful, received auth key')
          
          // Step 2: Test API access with system info using the auth key
          const systemUrl = `${config.hostUrl}${config.apiEndpoint}/system`
          
          const systemResponse = await fetch(systemUrl, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json',
              'Fineract-Platform-TenantId': config.tenantId,
              'Authorization': `Basic ${authData.base64EncodedAuthenticationKey}`
            }
          })

    if (!systemResponse.ok) {
      return {
        success: false,
        error: `System info request failed: ${systemResponse.status}`
      }
    }

    const systemInfo = await systemResponse.json()

          // Step 3: Test loan products access using Basic Auth (this works!)
          const loanProductsUrl = `${config.hostUrl}${config.apiEndpoint}/loanproducts`
          const basicAuth = Buffer.from(`${config.username}:${config.password}`).toString('base64')
          
          const loanProductsResponse = await fetch(loanProductsUrl, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json',
              'Fineract-Platform-TenantId': config.tenantId,
              'Authorization': `Basic ${basicAuth}`
            }
          })

    let loanProductsCount = 0
    if (loanProductsResponse.ok) {
      const loanProducts = await loanProductsResponse.json()
      loanProductsCount = Array.isArray(loanProducts) ? loanProducts.length : 0
    }

    return {
      success: true,
      systemInfo: {
        ...systemInfo,
        loanProductsCount,
        apiEndpoint: config.apiEndpoint,
        tenantId: config.tenantId
      }
    }

  } catch (error) {
    return {
      success: false,
      error: `Connection test failed: ${error.message}`
    }
  }
}

