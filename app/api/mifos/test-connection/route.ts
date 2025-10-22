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

    const { host_url, username, password, tenant_id, api_endpoint } = await request.json()

    // Validate required fields
    if (!host_url || !username || !password || !tenant_id) {
      return NextResponse.json({
        error: 'host_url, username, password, and tenant_id are required'
      }, { status: 400 })
    }

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
    
    const authResponse = await fetch(authUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Fineract-Platform-TenantId': config.tenantId
      },
      body: JSON.stringify({
        username: config.username,
        password: config.password
      })
    })

    if (!authResponse.ok) {
      const errorBody = await authResponse.text()
      return {
        success: false,
        error: `Authentication failed: ${authResponse.status} - ${errorBody}`
      }
    }

    const authData = await authResponse.json()
    
    if (!authData.access_token) {
      return {
        success: false,
        error: 'No access token received from Mifos X'
      }
    }

    // Step 2: Test API access with system info
    const systemUrl = `${config.hostUrl}${config.apiEndpoint}/system`
    
    const systemResponse = await fetch(systemUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Fineract-Platform-TenantId': config.tenantId,
        'Authorization': `Bearer ${authData.access_token}`
      }
    })

    if (!systemResponse.ok) {
      return {
        success: false,
        error: `System info request failed: ${systemResponse.status}`
      }
    }

    const systemInfo = await systemResponse.json()

    // Step 3: Test loan products access (optional)
    const loanProductsUrl = `${config.hostUrl}${config.apiEndpoint}/loanproducts`
    
    const loanProductsResponse = await fetch(loanProductsUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Fineract-Platform-TenantId': config.tenantId,
        'Authorization': `Bearer ${authData.access_token}`
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

