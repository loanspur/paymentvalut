import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const partner_name = searchParams.get('partner_name') || 'Kulman'
    const charge_type = searchParams.get('charge_type') || 'disbursement'

    // Step 1: Find the partner
    const { data: partners, error: partnerError } = await supabase
      .from('partners')
      .select('id, name')
      .ilike('name', `%${partner_name}%`)

    if (partnerError || !partners || partners.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Partner not found',
        step: 'partner_lookup'
      })
    }

    const partner = partners[0]
    console.log(`✅ Found partner: ${partner.name} (ID: ${partner.id})`)

    // Step 2: Get charge config for this partner
    const { data: chargeConfigs, error: configError } = await supabase
      .from('partner_charges_config')
      .select('*')
      .eq('partner_id', partner.id)
      .eq('charge_type', charge_type)

    if (configError || !chargeConfigs || chargeConfigs.length === 0) {
      return NextResponse.json({
        success: false,
        error: `No ${charge_type} charge config found for ${partner.name}`,
        step: 'charge_config_lookup',
        partner_id: partner.id,
        partner_name: partner.name
      })
    }

    const chargeConfig = chargeConfigs[0]
    console.log(`✅ Found charge config: ${chargeConfig.charge_name} (ID: ${chargeConfig.id})`)

    // Step 3: Get partner wallets
    const { data: wallets, error: walletsError } = await supabase
      .from('partner_wallets')
      .select('id, partner_id, current_balance')
      .eq('partner_id', partner.id)

    if (walletsError || !wallets || wallets.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No wallet found for partner',
        step: 'wallet_lookup',
        partner_id: partner.id
      })
    }

    const wallet = wallets[0]
    console.log(`✅ Found wallet: ${wallet.id} (Balance: ${wallet.current_balance})`)

    // Step 4: Get ALL wallet transactions for this wallet
    const { data: allTransactions, error: transactionsError } = await supabase
      .from('wallet_transactions')
      .select('*')
      .eq('wallet_id', wallet.id)
      .order('created_at', { ascending: false })

    if (transactionsError) {
      return NextResponse.json({
        success: false,
        error: 'Error fetching transactions',
        step: 'transactions_lookup',
        error_details: transactionsError
      })
    }

    console.log(`✅ Found ${allTransactions?.length || 0} total wallet transactions`)

    // Step 5: Filter charge transactions
    const chargeTransactions = allTransactions?.filter(t => 
      t.transaction_type === 'charge' || t.transaction_type === 'sms_charge' || t.transaction_type === 'b2c_float_purchase'
    ) || []

    console.log(`✅ Found ${chargeTransactions.length} charge transactions`)

    // Step 6: Analyze charge transactions
    const analysis = {
      partner: {
        id: partner.id,
        name: partner.name
      },
      charge_config: {
        id: chargeConfig.id,
        charge_name: chargeConfig.charge_name,
        charge_type: chargeConfig.charge_type,
        charge_amount: chargeConfig.charge_amount,
        is_active: chargeConfig.is_active
      },
      wallet: {
        id: wallet.id,
        current_balance: wallet.current_balance
      },
      total_charge_transactions: chargeTransactions.length,
      charge_transactions_by_type: {
        charge: chargeTransactions.filter(t => t.transaction_type === 'charge').length,
        sms_charge: chargeTransactions.filter(t => t.transaction_type === 'sms_charge').length,
        b2c_float_purchase: chargeTransactions.filter(t => t.transaction_type === 'b2c_float_purchase').length
      },
      charge_config_id_analysis: {
        transactions_with_charge_config_id: 0,
        transactions_matching_config_id: 0,
        transactions_with_different_config_id: 0,
        transactions_without_config_id: 0,
        unique_charge_config_ids_found: [] as string[]
      },
      disbursement_status_analysis: {
        transactions_with_disbursement_id: 0,
        disbursement_statuses: {} as Record<string, number>,
        transactions_with_success_status: 0
      },
      sample_transactions: [] as any[]
    }

    // Analyze each charge transaction
    chargeTransactions.forEach(t => {
      const metadata = t.metadata as any
      
      // Check charge_config_id
      if (metadata?.charge_config_id) {
        analysis.charge_config_id_analysis.transactions_with_charge_config_id++
        
        if (!analysis.charge_config_id_analysis.unique_charge_config_ids_found.includes(metadata.charge_config_id)) {
          analysis.charge_config_id_analysis.unique_charge_config_ids_found.push(metadata.charge_config_id)
        }
        
        if (metadata.charge_config_id === chargeConfig.id) {
          analysis.charge_config_id_analysis.transactions_matching_config_id++
        } else {
          analysis.charge_config_id_analysis.transactions_with_different_config_id++
        }
      } else {
        analysis.charge_config_id_analysis.transactions_without_config_id++
      }

      // For disbursement charges, check disbursement status
      if (charge_type === 'disbursement' && metadata?.disbursement_id) {
        analysis.disbursement_status_analysis.transactions_with_disbursement_id++
      }
    })

    // Step 7: Get disbursement statuses for transactions with disbursement_id
    let disbursementStatusMap: Record<string, string> = {}
    if (charge_type === 'disbursement') {
      const disbursementIds = chargeTransactions
        .map(t => (t.metadata as any)?.disbursement_id)
        .filter((id): id is string => !!id)
      
      if (disbursementIds.length > 0) {
        const uniqueDisbursementIds = Array.from(new Set(disbursementIds))
        const BATCH_SIZE = 100 // Supabase query limit
        
        console.log(`📊 Fetching statuses for ${uniqueDisbursementIds.length} unique disbursements`)
        
        // Fetch in batches
        for (let i = 0; i < uniqueDisbursementIds.length; i += BATCH_SIZE) {
          const batch = uniqueDisbursementIds.slice(i, i + BATCH_SIZE)
          const { data: disbursements, error: dispError } = await supabase
            .from('disbursement_requests')
            .select('id, status')
            .in('id', batch)
          
          if (!dispError && disbursements) {
            disbursements.forEach(d => {
              disbursementStatusMap[d.id] = d.status
            })
          } else if (dispError) {
            console.error(`❌ Error fetching disbursement batch ${i / BATCH_SIZE + 1}:`, dispError)
          }
        }
        
        const successCount = Object.values(disbursementStatusMap).filter(s => s === 'success').length
        console.log(`📊 Loaded ${Object.keys(disbursementStatusMap).length} disbursement statuses, ${successCount} with status 'success'`)

        chargeTransactions.forEach(t => {
          const metadata = t.metadata as any
          if (metadata?.disbursement_id && disbursementStatusMap[metadata.disbursement_id]) {
            const status = disbursementStatusMap[metadata.disbursement_id]
            analysis.disbursement_status_analysis.disbursement_statuses[status] = 
              (analysis.disbursement_status_analysis.disbursement_statuses[status] || 0) + 1
            
            if (status === 'success') {
              analysis.disbursement_status_analysis.transactions_with_success_status++
            }
          }
        })
      }
    }

    // Step 8: Calculate final count based on current logic
    // Get disbursement statuses for final count
    const sampleTransactions = chargeTransactions.slice(0, 10).map(t => ({
      id: t.id,
      transaction_type: t.transaction_type,
      amount: t.amount,
      status: t.status,
      created_at: t.created_at,
      description: t.description,
      charge_config_id: (t.metadata as any)?.charge_config_id,
      matches_config: (t.metadata as any)?.charge_config_id === chargeConfig.id,
      disbursement_id: (t.metadata as any)?.disbursement_id
    }))

    // Add disbursement statuses to sample transactions
    const sampleDisbursementIds = sampleTransactions
      .map(st => st.disbursement_id)
      .filter((id): id is string => !!id && charge_type === 'disbursement')
    
    let sampleDisbursementStatusMap: Record<string, string> = {}
    if (sampleDisbursementIds.length > 0) {
      const { data: sampleDisbursements } = await supabase
        .from('disbursement_requests')
        .select('id, status')
        .in('id', Array.from(new Set(sampleDisbursementIds)))
      
      if (sampleDisbursements) {
        sampleDisbursementStatusMap = sampleDisbursements.reduce((acc, d) => {
          acc[d.id] = d.status
          return acc
        }, {} as Record<string, string>)
      }
    }

    analysis.sample_transactions = sampleTransactions.map(st => ({
      ...st,
      disbursement_status: st.disbursement_id ? sampleDisbursementStatusMap[st.disbursement_id] || 'NOT_FOUND' : 'N/A'
    }))

    // Step 9: Calculate final count based on current logic
    // Use the disbursementStatusMap we already fetched
    let finalSuccessCount = 0
    if (charge_type === 'disbursement') {
      // Reuse the disbursementStatusMap from Step 7
      finalSuccessCount = chargeTransactions.filter(t => {
        const metadata = t.metadata as any
        if (metadata?.charge_config_id !== chargeConfig.id || t.transaction_type !== 'charge') {
          return false
        }
        if (!metadata?.disbursement_id) {
          return false
        }
        const status = disbursementStatusMap[metadata.disbursement_id]
        return status === 'success'
      }).length
    } else if (charge_type === 'sms_charge') {
      // SMS charges: match by charge_config_id in metadata AND transaction_type = 'sms_charge'
      // If charge_config_id is null (backward compatibility), match by partner_id and transaction_type
      finalSuccessCount = chargeTransactions.filter(t => {
        const metadata = t.metadata as any
        if (metadata?.charge_config_id !== null && metadata?.charge_config_id !== undefined) {
          // New transactions with charge_config_id: match exactly
          return t.transaction_type === 'sms_charge' && metadata?.charge_config_id === chargeConfig.id
        } else {
          // Old transactions without charge_config_id: match by partner_id for backward compatibility
          return t.transaction_type === 'sms_charge'
        }
      }).length
    } else if (charge_type === 'float_purchase') {
      // Float purchase charges: match by charge_config_id in metadata AND transaction_type = 'b2c_float_purchase'
      finalSuccessCount = chargeTransactions.filter(t => {
        const metadata = t.metadata as any
        return t.transaction_type === 'b2c_float_purchase' && metadata?.charge_config_id === chargeConfig.id
      }).length
    } else {
      // For non-disbursement, non-SMS charges, count all matching charge_config_id
      finalSuccessCount = chargeTransactions.filter(t => {
        const metadata = t.metadata as any
        return metadata?.charge_config_id === chargeConfig.id && t.transaction_type === 'charge'
      }).length
    }

    analysis['final_calculation'] = {
      total_charge_transactions: chargeTransactions.length,
      transactions_matching_charge_config_id: analysis.charge_config_id_analysis.transactions_matching_config_id,
      transactions_with_success_disbursement_status: finalSuccessCount,
      expected_count: charge_type === 'disbursement' ? finalSuccessCount : analysis.charge_config_id_analysis.transactions_matching_config_id
    }

    return NextResponse.json({
      success: true,
      analysis
    })

  } catch (error) {
    console.error('Diagnostic Error:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}

