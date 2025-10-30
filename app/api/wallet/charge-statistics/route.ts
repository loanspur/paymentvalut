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

    // Build wallet scope
    let walletQuery = supabase
      .from('partner_wallets')
      .select('id, partner_id')

    if (requestedPartnerId) {
      walletQuery = walletQuery.eq('partner_id', requestedPartnerId)
    } else if (payload.role !== 'super_admin' && payload.role !== 'admin') {
      walletQuery = walletQuery.eq('partner_id', payload.userId ? undefined : undefined) // placeholder, will override below
    }

    // If not admin, fetch the user's partner_id
    if (!requestedPartnerId && payload.role !== 'super_admin' && payload.role !== 'admin') {
      const { data: userRow } = await supabase
        .from('users')
        .select('partner_id')
        .eq('id', payload.userId)
        .single()
      if (!userRow?.partner_id) {
        return NextResponse.json({ success: false, error: 'No partner assigned' }, { status: 400 })
      }
      walletQuery = walletQuery.eq('partner_id', userRow.partner_id)
    }

    const { data: wallets, error: walletsError } = await walletQuery

    if (walletsError || !wallets || wallets.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No wallets found' },
        { status: 404 }
      )
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
        .select('amount, metadata, transaction_type')
        .in('wallet_id', walletIds)
        .in('transaction_type', ['charge', 'sms_charge', 'b2c_float_purchase'])
        .gte('created_at', sinceIso)
      return data || []
    }

    const todayCharges = await fetchChargesSince(today.toISOString())
    const weekCharges = await fetchChargesSince(sevenDaysAgo.toISOString())
    const monthCharges = await fetchChargesSince(thirtyDaysAgo.toISOString())
    const quarterCharges = await fetchChargesSince(ninetyDaysAgo.toISOString())

    // Calculate statistics
    const calculateStats = (charges: any[]) => {
      const totalAmount = charges.reduce((sum, charge) => {
        if (charge.transaction_type === 'b2c_float_purchase') {
          const fee = Math.abs(charge.metadata?.charges || 0)
          return sum + fee
        }
        return sum + Math.abs(charge.amount)
      }, 0)
      const chargeTypes: Record<string, { count: number, amount: number }> = {}
      
      charges.forEach(charge => {
        const chargeName = charge.transaction_type === 'b2c_float_purchase'
          ? (charge.metadata?.charge_name || 'Float Purchase Fee')
          : (charge.metadata?.charge_name || (charge.transaction_type === 'sms_charge' ? 'SMS Charges' : 'Charges'))
        if (!chargeTypes[chargeName]) {
          chargeTypes[chargeName] = { count: 0, amount: 0 }
        }
        if (charge.transaction_type === 'b2c_float_purchase') {
          const fee = Math.abs(charge.metadata?.charges || 0)
          if (fee > 0) {
            chargeTypes[chargeName].count += 1
            chargeTypes[chargeName].amount += fee
          }
        } else {
          chargeTypes[chargeName].count += 1
          chargeTypes[chargeName].amount += Math.abs(charge.amount)
        }
      })

      return {
        totalTransactions: charges.length,
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
