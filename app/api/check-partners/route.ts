import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase environment variables')
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Checking partners configuration...')
    
    // Get all partners
    const { data: partners, error } = await supabase
      .from('partners')
      .select('*')
      .order('name')

    if (error) {
      return NextResponse.json({
        error: 'Failed to fetch partners',
        details: error.message
      }, { status: 500 })
    }

    console.log(`Found ${partners.length} partners`)

    // Check for M-Pesa configured partners
    const mpesaConfiguredPartners = partners.filter(p => p.is_mpesa_configured)
    
    const response = {
      total_partners: partners.length,
      mpesa_configured: mpesaConfiguredPartners.length,
      partners: partners.map(partner => ({
        id: partner.id,
        name: partner.name,
        short_code: partner.short_code,
        mpesa_shortcode: partner.mpesa_shortcode,
        mpesa_environment: partner.mpesa_environment,
        is_mpesa_configured: partner.is_mpesa_configured,
        is_active: partner.is_active,
        has_consumer_key: !!partner.mpesa_consumer_key,
        has_consumer_secret: !!partner.mpesa_consumer_secret,
        has_initiator_password: !!partner.mpesa_initiator_password
      }))
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error('❌ Error checking partners:', error)
    return NextResponse.json({
      error: 'Failed to check partners',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('🔧 Fixing partner configuration...')
    
    // Get all partners
    const { data: partners, error } = await supabase
      .from('partners')
      .select('*')

    if (error) {
      return NextResponse.json({
        error: 'Failed to fetch partners',
        details: error.message
      }, { status: 500 })
    }

    // Find partners that have M-Pesa credentials but are not marked as configured
    const partnersToFix = partners.filter(p => 
      p.mpesa_consumer_key && 
      p.mpesa_consumer_secret && 
      p.mpesa_shortcode && 
      !p.is_mpesa_configured
    )

    console.log(`Found ${partnersToFix.length} partners to fix`)

    // Update partners to mark them as M-Pesa configured
    const updatePromises = partnersToFix.map(partner => 
      supabase
        .from('partners')
        .update({ 
          is_mpesa_configured: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', partner.id)
    )

    const results = await Promise.all(updatePromises)
    const errors = results.filter(r => r.error)
    
    if (errors.length > 0) {
      return NextResponse.json({
        error: 'Some updates failed',
        details: errors.map(e => e.error?.message).join(', ')
      }, { status: 500 })
    }

    return NextResponse.json({
      message: `Successfully updated ${partnersToFix.length} partners`,
      updated_partners: partnersToFix.map(p => ({
        id: p.id,
        name: p.name,
        short_code: p.short_code
      }))
    })

  } catch (error) {
    console.error('❌ Error fixing partners:', error)
    return NextResponse.json({
      error: 'Failed to fix partners',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
