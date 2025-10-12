import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { jwtVerify } from 'jose'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase environment variables')
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Get partner balance sync settings
export async function GET(request: NextRequest) {
  try {
    // Authentication check
    const token = request.cookies.get('auth_token')?.value
    
    if (!token) {
      return NextResponse.json({
        error: 'Access denied',
        message: 'Authentication required'
      }, { status: 401 })
    }

    // Verify the JWT token
    const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'your-secret-key-change-in-production')
    const { payload } = await jwtVerify(token, secret)
    
    if (!payload || !payload.userId) {
      return NextResponse.json({
        error: 'Invalid authentication',
        message: 'Invalid token'
      }, { status: 401 })
    }

    // Get current user from database
    const { data: currentUser, error: userError } = await supabase
      .from('users')
      .select('id, role, partner_id, is_active')
      .eq('id', payload.userId)
      .single()

    if (userError || !currentUser || !currentUser.is_active) {
      return NextResponse.json({
        error: 'Invalid authentication',
        message: 'User not found or inactive'
      }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const partnerId = searchParams.get('partner_id')

    // Build query for partners
    let partnersQuery = supabase
      .from('partners')
      .select(`
        id,
        name,
        short_code,
        mpesa_shortcode,
        is_active,
        is_mpesa_configured,
        balance_sync_enabled,
        balance_sync_interval,
        auto_sync_enabled,
        last_balance_sync,
        created_at,
        updated_at
      `)
      .eq('is_active', true)

    // Filter by user role and specific partner
    if (currentUser.role !== 'super_admin' && currentUser.partner_id) {
      partnersQuery = partnersQuery.eq('id', currentUser.partner_id)
    } else if (partnerId) {
      partnersQuery = partnersQuery.eq('id', partnerId)
    }

    const { data: partners, error: partnersError } = await partnersQuery

    if (partnersError) {
      return NextResponse.json(
        { error: 'Failed to fetch partner settings' },
        { status: 500 }
      )
    }

    // Get sync logs for each partner (with fallback if table doesn't exist)
    const partnersWithLogs = await Promise.all(
      partners.map(async (partner) => {
        let syncLogs = []
        let logsError = null

        try {
          const { data, error } = await supabase
            .from('balance_sync_logs')
            .select('*')
            .eq('partner_id', partner.id)
            .order('synced_at', { ascending: false })
            .limit(10)
          
          syncLogs = data || []
          logsError = error
        } catch (error) {
          // Table doesn't exist yet, use empty array
          syncLogs = []
          logsError = error
        }

        return {
          ...partner,
          sync_logs: syncLogs,
          sync_status: {
            last_sync: partner.last_balance_sync || null,
            sync_enabled: partner.balance_sync_enabled || false,
            auto_sync_enabled: partner.auto_sync_enabled || false,
            sync_interval: partner.balance_sync_interval || 30,
            next_sync: partner.last_balance_sync ? 
              new Date(new Date(partner.last_balance_sync).getTime() + (partner.balance_sync_interval || 30) * 60000).toISOString() :
              new Date().toISOString()
          }
        }
      })
    )

    return NextResponse.json({
      success: true,
      partners: partnersWithLogs,
      timestamp: new Date().toISOString()
    })

  } catch (error: any) {
    // Error fetching partner balance settings
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error.message,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}

// Update partner balance sync settings
export async function PUT(request: NextRequest) {
  try {
    // Authentication check
    const token = request.cookies.get('auth_token')?.value
    
    if (!token) {
      return NextResponse.json({
        error: 'Access denied',
        message: 'Authentication required'
      }, { status: 401 })
    }

    // Verify the JWT token
    const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'your-secret-key-change-in-production')
    const { payload } = await jwtVerify(token, secret)
    
    if (!payload || !payload.userId) {
      return NextResponse.json({
        error: 'Invalid authentication',
        message: 'Invalid token'
      }, { status: 401 })
    }

    // Get current user from database
    const { data: currentUser, error: userError } = await supabase
      .from('users')
      .select('id, role, partner_id, is_active')
      .eq('id', payload.userId)
      .single()

    if (userError || !currentUser || !currentUser.is_active) {
      return NextResponse.json({
        error: 'Invalid authentication',
        message: 'User not found or inactive'
      }, { status: 401 })
    }

    const body = await request.json()
    const { 
      partner_id, 
      balance_sync_enabled, 
      balance_sync_interval, 
      auto_sync_enabled 
    } = body

    if (!partner_id) {
      return NextResponse.json(
        { error: 'Partner ID is required' },
        { status: 400 }
      )
    }

    // Check if user has permission to update this partner
    if (currentUser.role !== 'super_admin' && currentUser.partner_id !== partner_id) {
      return NextResponse.json(
        { error: 'Access denied', message: 'You can only update your assigned partner' },
        { status: 403 }
      )
    }

    // Validate sync interval (must be between 5 and 1440 minutes)
    if (balance_sync_interval && (balance_sync_interval < 5 || balance_sync_interval > 1440)) {
      return NextResponse.json(
        { error: 'Sync interval must be between 5 and 1440 minutes' },
        { status: 400 }
      )
    }

    // Update partner settings
    const updateData: any = {
      updated_at: new Date().toISOString()
    }

    if (balance_sync_enabled !== undefined) {
      updateData.balance_sync_enabled = balance_sync_enabled
    }
    if (balance_sync_interval !== undefined) {
      updateData.balance_sync_interval = balance_sync_interval
    }
    if (auto_sync_enabled !== undefined) {
      updateData.auto_sync_enabled = auto_sync_enabled
    }

    const { data: updatedPartner, error: updateError } = await supabase
      .from('partners')
      .update(updateData)
      .eq('id', partner_id)
      .select()
      .single()

    if (updateError) {
      return NextResponse.json(
        { error: 'Failed to update partner settings', details: updateError.message },
        { status: 500 }
      )
    }

    // Log the settings change (with fallback if table doesn't exist)
    try {
      await supabase
        .from('balance_sync_logs')
        .insert({
          partner_id: partner_id,
          sync_type: 'settings_update',
          status: 'completed',
          trigger_result: {
            updated_by: currentUser.id,
            changes: updateData,
            timestamp: new Date().toISOString()
          },
          synced_at: new Date().toISOString()
        })
    } catch (error) {
      // Table doesn't exist yet, continue without logging
    }

    return NextResponse.json({
      success: true,
      message: 'Partner balance sync settings updated successfully',
      partner: updatedPartner,
      timestamp: new Date().toISOString()
    })

  } catch (error: any) {
    // Error updating partner balance settings
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error.message,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}
