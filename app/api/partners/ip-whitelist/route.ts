import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase environment variables')
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { partner_id, allowed_ips, ip_whitelist_enabled } = body

    if (!partner_id) {
      return NextResponse.json({
        error: 'Partner ID is required'
      }, { status: 400 })
    }

    // Validate IP addresses format
    if (allowed_ips && Array.isArray(allowed_ips)) {
      const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$|^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/
      
      for (const ip of allowed_ips) {
        if (!ipRegex.test(ip)) {
          return NextResponse.json({
            error: `Invalid IP address format: ${ip}`
          }, { status: 400 })
        }
      }
    }

    // Update partner IP whitelist settings
    const { data: updatedPartner, error: updateError } = await supabase
      .from('partners')
      .update({
        allowed_ips: allowed_ips || [],
        ip_whitelist_enabled: ip_whitelist_enabled || false,
        updated_at: new Date().toISOString()
      })
      .eq('id', partner_id)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating partner IP whitelist:', updateError)
      return NextResponse.json({
        error: 'Failed to update IP whitelist',
        message: updateError.message
      }, { status: 500 })
    }

    console.log(`✅ Updated IP whitelist for partner ${updatedPartner.name}:`, {
      enabled: ip_whitelist_enabled,
      ips: allowed_ips
    })

    return NextResponse.json({
      success: true,
      message: 'IP whitelist updated successfully',
      partner: updatedPartner
    })

  } catch (error) {
    console.error('❌ IP whitelist update error:', error)
    return NextResponse.json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const partnerId = searchParams.get('partner_id')

    let query = supabase
      .from('partners')
      .select('id, name, allowed_ips, ip_whitelist_enabled, is_active')

    if (partnerId) {
      query = query.eq('id', partnerId)
    }

    const { data: partners, error } = await query

    if (error) {
      console.error('Error fetching partners:', error)
      return NextResponse.json({
        error: 'Failed to fetch partners',
        message: error.message
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      partners: partners || []
    })

  } catch (error) {
    console.error('❌ Error fetching partners:', error)
    return NextResponse.json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
