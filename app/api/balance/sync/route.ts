import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { jwtVerify } from 'jose'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase environment variables')
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Real-time balance synchronization service
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
    const syncMode = searchParams.get('mode') || 'auto' // auto, manual, force

    // Get partners with their sync settings
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
        last_balance_sync,
        auto_sync_enabled
      `)
      .eq('is_active', true)
      .eq('is_mpesa_configured', true)

    // Filter by user role and specific partner
    if (currentUser.role !== 'super_admin' && currentUser.partner_id) {
      partnersQuery = partnersQuery.eq('id', currentUser.partner_id)
    } else if (partnerId) {
      partnersQuery = partnersQuery.eq('id', partnerId)
    }

    const { data: partners, error: partnersError } = await partnersQuery

    if (partnersError) {
      // Error fetching partners for sync
      return NextResponse.json(
        { error: 'Failed to fetch partners' },
        { status: 500 }
      )
    }

    if (!partners || partners.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No partners found for synchronization',
        sync_results: [],
        timestamp: new Date().toISOString()
      })
    }

    // Determine which partners need sync
    const partnersToSync = partners.filter(partner => {
      if (syncMode === 'force') return true
      if (!partner.balance_sync_enabled) return false
      if (syncMode === 'manual') return true
      
      // Auto sync logic
      if (!partner.auto_sync_enabled) return false
      
      const lastSync = partner.last_balance_sync ? new Date(partner.last_balance_sync) : new Date(0)
      const syncInterval = partner.balance_sync_interval || 30 // default 30 minutes
      const timeSinceLastSync = (Date.now() - lastSync.getTime()) / (1000 * 60) // minutes
      
      return timeSinceLastSync >= syncInterval
    })

    if (partnersToSync.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No partners require synchronization at this time',
        sync_results: [],
        timestamp: new Date().toISOString()
      })
    }

    // Perform balance synchronization for each partner
    const syncResults = await Promise.all(
      partnersToSync.map(async (partner) => {
        try {
          // Trigger balance check for this partner
          const triggerResponse = await fetch(`${request.nextUrl.origin}/api/balance/trigger-check`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${supabaseServiceKey}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              partner_id: partner.id,
              force_check: true
            })
          })

          if (!triggerResponse.ok) {
            const errorData = await triggerResponse.json()
            throw new Error(errorData.error || 'Failed to trigger balance check')
          }

          const triggerResult = await triggerResponse.json()
          
          // Update partner's last sync timestamp
          const { error: updateError } = await supabase
            .from('partners')
            .update({
              last_balance_sync: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq('id', partner.id)

          if (updateError) {
            // Log error but continue processing
          }

          // Log sync activity (with fallback if table doesn't exist)
          try {
            await supabase
              .from('balance_sync_logs')
              .insert({
                partner_id: partner.id,
                sync_type: syncMode,
                status: 'completed',
                trigger_result: triggerResult,
                synced_at: new Date().toISOString()
              })
          } catch (error) {
            // Table doesn't exist yet, continue without logging
          }

          // Balance sync completed successfully

          return {
            partner_id: partner.id,
            partner_name: partner.name,
            status: 'success',
            sync_type: syncMode,
            trigger_result: triggerResult,
            synced_at: new Date().toISOString()
          }

        } catch (error: any) {
          // Balance sync failed
          
          // Log failed sync (with fallback if table doesn't exist)
          try {
            await supabase
              .from('balance_sync_logs')
              .insert({
                partner_id: partner.id,
                sync_type: syncMode,
                status: 'failed',
                error_message: error.message,
                synced_at: new Date().toISOString()
              })
          } catch (logError) {
            // Table doesn't exist yet, continue without logging
          }

          return {
            partner_id: partner.id,
            partner_name: partner.name,
            status: 'failed',
            sync_type: syncMode,
            error: error.message,
            synced_at: new Date().toISOString()
          }
        }
      })
    )

    const successful = syncResults.filter(r => r.status === 'success').length
    const failed = syncResults.filter(r => r.status === 'failed').length

    return NextResponse.json({
      success: true,
      message: `Balance synchronization completed: ${successful} successful, ${failed} failed`,
      sync_results: syncResults,
      summary: {
        total_partners: partnersToSync.length,
        successful,
        failed,
        sync_mode: syncMode
      },
      timestamp: new Date().toISOString()
    })

  } catch (error: any) {
    // Error in balance synchronization
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

// Manual sync trigger
export async function POST(request: NextRequest) {
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

    const body = await request.json()
    const { partner_id, sync_mode = 'manual', force_sync = false } = body

    // Trigger sync with specified parameters
    const syncUrl = new URL('/api/balance/sync', request.url)
    if (partner_id) syncUrl.searchParams.set('partner_id', partner_id)
    if (force_sync) syncUrl.searchParams.set('mode', 'force')
    else syncUrl.searchParams.set('mode', sync_mode)

    const syncResponse = await fetch(syncUrl.toString(), {
      method: 'GET',
      headers: {
        'Cookie': `auth_token=${token}`
      }
    })

    if (!syncResponse.ok) {
      const errorData = await syncResponse.json()
      return NextResponse.json(
        { 
          error: 'Failed to trigger synchronization',
          details: errorData.error || 'Unknown error'
        },
        { status: 500 }
      )
    }

    const syncResult = await syncResponse.json()

    return NextResponse.json({
      success: true,
      message: 'Balance synchronization triggered successfully',
      sync_result: syncResult,
      timestamp: new Date().toISOString()
    })

  } catch (error: any) {
    // Error triggering balance sync
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
