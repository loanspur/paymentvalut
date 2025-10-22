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
      .select('partner_id')
      .eq('id', payload.userId)
      .single()

    if (userError || !userData?.partner_id) {
      return NextResponse.json({ error: 'Partner not found' }, { status: 404 })
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

async function fetchLoanProductsFromMifos(partner: any): Promise<any[]> {
  try {
    // Authenticate with Mifos X
    const authUrl = `${partner.mifos_host_url}${partner.mifos_api_endpoint || '/fineract-provider/api/v1'}/authentication`
    
    const authResponse = await fetch(authUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Fineract-Platform-TenantId': partner.mifos_tenant_id
      },
      body: JSON.stringify({
        username: partner.mifos_username,
        password: partner.mifos_password
      })
    })

    if (!authResponse.ok) {
      throw new Error(`Mifos X authentication failed: ${authResponse.status}`)
    }

    const authData = await authResponse.json()
    const accessToken = authData.access_token

    // Fetch loan products
    const productsUrl = `${partner.mifos_host_url}${partner.mifos_api_endpoint || '/fineract-provider/api/v1'}/loanproducts`
    
    const productsResponse = await fetch(productsUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Fineract-Platform-TenantId': partner.mifos_tenant_id,
        'Authorization': `Bearer ${accessToken}`
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

