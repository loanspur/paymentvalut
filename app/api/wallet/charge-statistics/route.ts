import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyJWTToken } from '../../../../lib/jwt-utils'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  try {
    // Scope by authenticated user (single source of truth per-tenant; admins can aggregate)
    const token = request.cookies.get('auth_token')?.value
    if (!token) {
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 })
    }

    const payload = await verifyJWTToken(token)
    if (!payload) {
      return NextResponse.json({ success: false, error: 'Invalid session' }, { status: 401 })
    }

    // Optional partner_id query param (admins only)
    const { searchParams } = new URL(request.url)
    const requestedPartnerId = searchParams.get('partner_id')

    // Get current user from database to get partner_id and role
    const { data: currentUser, error: userError } = await supabase
      .from('users')
      .select('id, role, partner_id, is_active')
      .eq('id', payload.userId)
      .single()

    if (userError || !currentUser || !currentUser.is_active) {
      return NextResponse.json({ success: false, error: 'User not found or inactive' }, { status: 401 })
    }

    // Determine which partner's wallets to query - SECURITY: Enforce partner isolation
    let partnerId: string | null = null
    
    if (currentUser.role === 'super_admin') {
      // Super admin can query any partner via query param
      partnerId = requestedPartnerId || currentUser.partner_id || null
    } else {
      // All other users (including admin, partner_admin, etc.) can only access their own partner
      partnerId = currentUser.partner_id
      
      // If they requested a different partner, deny access
      if (requestedPartnerId && requestedPartnerId !== currentUser.partner_id) {
        return NextResponse.json(
          { success: false, error: 'Access denied: You can only view your own partner\'s charge statistics' },
          { status: 403 }
        )
      }
    }

    if (!partnerId) {
      return NextResponse.json(
        { success: false, error: 'No partner assigned. Please contact your administrator to assign a partner to your account.' },
        { status: 400 }
      )
    }

    // Get wallets for the partner
    const { data: wallets, error: walletsError } = await supabase
      .from('partner_wallets')
      .select('id, partner_id')
      .eq('partner_id', partnerId)

    if (walletsError) {
      console.error('Wallet fetch error:', walletsError)
      return NextResponse.json(
        { success: false, error: 'Failed to fetch wallet data' },
        { status: 500 }
      )
    }

    // Return empty stats if no wallets found (instead of 404)
    if (!wallets || wallets.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          today: { totalTransactions: 0, totalAmount: 0, chargeTypes: {} },
          week: { totalTransactions: 0, totalAmount: 0, chargeTypes: {} },
          month: { totalTransactions: 0, totalAmount: 0, chargeTypes: {} },
          quarter: { totalTransactions: 0, totalAmount: 0, chargeTypes: {} }
        }
      })
    }

    const walletIds = wallets.map(w => w.id)
    const now = new Date()
    
    // Calculate date ranges
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const sevenDaysAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
    const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)
    const ninetyDaysAgo = new Date(today.getTime() - 90 * 24 * 60 * 60 * 1000)

    // Helper to fetch charges for a period from the single source: wallet_transactions
    const fetchChargesSince = async (sinceIso: string) => {
      const { data } = await supabase
        .from('wallet_transactions')
        .select('amount, metadata, transaction_type, status')
        .in('wallet_id', walletIds)
        .in('transaction_type', ['charge', 'sms_charge', 'b2c_float_purchase'])
        .eq('status', 'completed') // Only count completed transactions
        .gte('created_at', sinceIso)
      return data || []
    }

    const todayCharges = await fetchChargesSince(today.toISOString())
    const weekCharges = await fetchChargesSince(sevenDaysAgo.toISOString())
    const monthCharges = await fetchChargesSince(thirtyDaysAgo.toISOString())
    const quarterCharges = await fetchChargesSince(ninetyDaysAgo.toISOString())

    // Calculate statistics
    const calculateStats = (charges: any[]) => {
      // Filter only completed transactions
      const completedCharges = charges.filter(c => c.status === 'completed')
      
      const totalAmount = completedCharges.reduce((sum, charge) => {
        if (charge.transaction_type === 'b2c_float_purchase') {
          // For float purchases, use the charge amount from metadata or the transaction amount
          const fee = Math.abs(charge.metadata?.charges || charge.metadata?.charge_amount || charge.amount || 0)
          return sum + fee
        }
        // For other charges, use the absolute amount
        return sum + Math.abs(charge.amount || 0)
      }, 0)
      
      const chargeTypes: Record<string, { count: number, amount: number }> = {}
      
      completedCharges.forEach(charge => {
        const chargeName = charge.transaction_type === 'b2c_float_purchase'
          ? (charge.metadata?.charge_name || 'Float Purchase Fee')
          : (charge.transaction_type === 'sms_charge' 
              ? 'SMS Charges' 
              : (charge.metadata?.charge_name || 'Transaction Charges'))
        
        if (!chargeTypes[chargeName]) {
          chargeTypes[chargeName] = { count: 0, amount: 0 }
        }
        
        if (charge.transaction_type === 'b2c_float_purchase') {
          const fee = Math.abs(charge.metadata?.charges || charge.metadata?.charge_amount || charge.amount || 0)
          if (fee > 0) {
            chargeTypes[chargeName].count += 1
            chargeTypes[chargeName].amount += fee
          }
        } else {
          const amount = Math.abs(charge.amount || 0)
          if (amount > 0) {
            chargeTypes[chargeName].count += 1
            chargeTypes[chargeName].amount += amount
          }
        }
      })

      return {
        totalTransactions: completedCharges.length,
        totalAmount,
        chargeTypes
      }
    }

    const stats = {
      today: calculateStats(todayCharges || []),
      week: calculateStats(weekCharges || []),
      month: calculateStats(monthCharges || []),
      quarter: calculateStats(quarterCharges || [])
    }

    return NextResponse.json({
      success: true,
      data: stats
    })

  } catch (error) {
    console.error('Charge Statistics GET Error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
