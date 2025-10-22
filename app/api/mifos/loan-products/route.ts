import { NextRequest, NextResponse } from 'next/server'
import { verifyJWTToken } from '../../../../lib/jwt-utils'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

export async function GET(request: NextRequest) {
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

    // Get user's partner information
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('partner_id, role')
      .eq('id', payload.userId)
      .single()

    if (userError) {
      console.error('Error fetching user data:', userError)
      return NextResponse.json({ error: 'Failed to fetch user information' }, { status: 500 })
    }

    if (!userData?.partner_id) {
      return NextResponse.json({ 
        error: 'No partner assigned to this user',
        details: 'Please contact your administrator to assign a partner to your account'
      }, { status: 400 })
    }

    // Get partner's Mifos X configuration
    const { data: partner, error: partnerError } = await supabase
      .from('partners')
      .select('*')
      .eq('id', userData.partner_id)
      .eq('is_mifos_configured', true)
      .single()

    if (partnerError || !partner) {
      return NextResponse.json({ 
        error: 'Mifos X not configured for this partner',
        details: 'Please configure Mifos X integration in partner settings'
      }, { status: 400 })
    }

    // Fetch loan products from Mifos X
    const loanProducts = await fetchLoanProductsFromMifos(partner)

    return NextResponse.json({
      success: true,
      products: loanProducts,
      partner: {
        name: partner.name,
        mifosHostUrl: partner.mifos_host_url
      }
    })

  } catch (error) {
    console.error('Error fetching loan products:', error)
    return NextResponse.json({
      error: 'Failed to fetch loan products',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

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
        error: 'All Mifos X connection fields are required'
      }, { status: 400 })
    }

    // Create a temporary partner object for fetching loan products
    const tempPartner = {
      mifos_host_url: host_url,
      mifos_username: username,
      mifos_password: password,
      mifos_tenant_id: tenant_id,
      mifos_api_endpoint: api_endpoint || '/fineract-provider/api/v1'
    }

    // Fetch loan products from Mifos X
    const loanProducts = await fetchLoanProductsFromMifos(tempPartner)

    return NextResponse.json({
      success: true,
      products: loanProducts,
      partner: {
        mifosHostUrl: host_url
      }
    })

  } catch (error) {
    console.error('Error fetching loan products:', error)
    return NextResponse.json({
      error: 'Failed to fetch loan products',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

async function fetchLoanProductsFromMifos(partner: any): Promise<any[]> {
  try {
    // Use HTTP Basic Authentication directly (this works for loan products)
    const basicAuth = Buffer.from(`${partner.mifos_username}:${partner.mifos_password}`).toString('base64')
    
    // Fetch loan products directly with Basic Auth
    const productsUrl = `${partner.mifos_host_url}${partner.mifos_api_endpoint || '/fineract-provider/api/v1'}/loanproducts`
    
    const productsResponse = await fetch(productsUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Fineract-Platform-TenantId': partner.mifos_tenant_id,
        'Authorization': `Basic ${basicAuth}`
      }
    })

    if (!productsResponse.ok) {
      throw new Error(`Failed to fetch loan products: ${productsResponse.status}`)
    }

    const products = await productsResponse.json()
    return products || []

  } catch (error) {
    console.error('Error fetching loan products from Mifos X:', error)
    throw error
  }
}

