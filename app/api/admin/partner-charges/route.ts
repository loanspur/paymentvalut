import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const partner_id = searchParams.get('partner_id')
    const charge_type = searchParams.get('charge_type')
    const is_active = searchParams.get('is_active')

    // Build query for partner charges configuration
    let query = supabase
      .from('partner_charges_config')
      .select(`
        *,
        partners!inner (
          id,
          name,
          is_active
        )
      `)
      .order('created_at', { ascending: false })

    // Apply filters
    if (partner_id) {
      query = query.eq('partner_id', partner_id)
    }

    if (charge_type) {
      query = query.eq('charge_type', charge_type)
    }

    if (is_active !== null && is_active !== undefined) {
      query = query.eq('is_active', is_active === 'true')
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching partner charges:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to fetch partner charges' },
        { status: 500 }
      )
    }

    // Get charge transaction summaries
    const chargeIds = data?.map(c => c.id) || []
    let transactionSummaries: Record<string, any> = {}

    if (chargeIds.length > 0) {
      const { data: transactions, error: transactionsError } = await supabase
        .from('partner_charge_transactions')
        .select('charge_config_id, status, charge_amount, created_at')
        .in('charge_config_id', chargeIds)

      if (!transactionsError && transactions) {
        // Group transactions by charge_config_id
        const chargeTransactionMap: Record<string, any[]> = {}
        transactions.forEach(t => {
          if (!chargeTransactionMap[t.charge_config_id]) {
            chargeTransactionMap[t.charge_config_id] = []
          }
          chargeTransactionMap[t.charge_config_id].push(t)
        })

        // Create summaries for each charge config
        chargeIds.forEach(chargeId => {
          const chargeTransactions = chargeTransactionMap[chargeId] || []
          transactionSummaries[chargeId] = {
            total_transactions: chargeTransactions.length,
            total_amount_collected: chargeTransactions.reduce((sum, t) => sum + (t.charge_amount || 0), 0),
            completed_transactions: chargeTransactions.filter(t => t.status === 'completed').length,
            pending_transactions: chargeTransactions.filter(t => t.status === 'pending').length,
            failed_transactions: chargeTransactions.filter(t => t.status === 'failed').length,
            today_transactions: chargeTransactions.filter(t => {
              const today = new Date().toISOString().split('T')[0]
              return t.created_at?.startsWith(today)
            }).length,
            today_amount: chargeTransactions.filter(t => {
              const today = new Date().toISOString().split('T')[0]
              return t.created_at?.startsWith(today)
            }).reduce((sum, t) => sum + (t.charge_amount || 0), 0)
          }
        })
      }
    }

    // Transform data to include transaction summaries
    const transformedData = data?.map(charge => ({
      ...charge,
      partner_name: charge.partners?.name,
      partner_active: charge.partners?.is_active,
      ...transactionSummaries[charge.id]
    })) || []

    return NextResponse.json({
      success: true,
      data: transformedData,
      summary: {
        total_charge_configs: transformedData.length,
        active_configs: transformedData.filter(c => c.is_active).length,
        total_amount_collected: transformedData.reduce((sum, c) => sum + (c.total_amount_collected || 0), 0),
        total_transactions: transformedData.reduce((sum, c) => sum + (c.total_transactions || 0), 0)
      }
    })

  } catch (error) {
    console.error('Partner Charges GET Error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const {
      partner_id,
      charge_type,
      charge_name,
      charge_amount,
      charge_percentage,
      minimum_charge,
      maximum_charge,
      is_active = true,
      is_automatic = true,
      charge_frequency = 'per_transaction',
      description
    } = await request.json()

    // Validate required fields
    if (!partner_id || !charge_type || !charge_name) {
      return NextResponse.json(
        { success: false, error: 'partner_id, charge_type, and charge_name are required' },
        { status: 400 }
      )
    }

    if (!charge_amount && !charge_percentage) {
      return NextResponse.json(
        { success: false, error: 'Either charge_amount or charge_percentage must be provided' },
        { status: 400 }
      )
    }

    // Check if partner exists
    const { data: partner, error: partnerError } = await supabase
      .from('partners')
      .select('id, name')
      .eq('id', partner_id)
      .single()

    if (partnerError || !partner) {
      return NextResponse.json(
        { success: false, error: 'Partner not found' },
        { status: 404 }
      )
    }

    // Check if charge configuration already exists for this partner and charge type
    const { data: existingConfig, error: checkError } = await supabase
      .from('partner_charges_config')
      .select('id')
      .eq('partner_id', partner_id)
      .eq('charge_type', charge_type)
      .single()

    let chargeConfig
    let error

    if (existingConfig) {
      // Update existing configuration
      const { data: updatedConfig, error: updateError } = await supabase
        .from('partner_charges_config')
        .update({
          charge_name,
          charge_amount: charge_amount || 0,
          charge_percentage,
          minimum_charge,
          maximum_charge,
          is_active,
          is_automatic,
          charge_frequency,
          description
        })
        .eq('id', existingConfig.id)
        .select(`
          *,
          partners!inner (
            id,
            name
          )
        `)
        .single()

      chargeConfig = updatedConfig
      error = updateError
    } else {
      // Create new configuration
      const { data: newConfig, error: insertError } = await supabase
        .from('partner_charges_config')
        .insert({
          partner_id,
          charge_type,
          charge_name,
          charge_amount: charge_amount || 0,
          charge_percentage,
          minimum_charge,
          maximum_charge,
          is_active,
          is_automatic,
          charge_frequency,
          description
        })
        .select(`
          *,
          partners!inner (
            id,
            name
          )
        `)
        .single()

      chargeConfig = newConfig
      error = insertError
    }

    if (error) {
      console.error('Error creating/updating charge configuration:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to create/update charge configuration' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: existingConfig ? 'Charge configuration updated successfully' : 'Charge configuration created successfully',
      data: {
        ...chargeConfig,
        partner_name: chargeConfig.partners?.name
      }
    })

  } catch (error) {
    console.error('Partner Charges POST Error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
