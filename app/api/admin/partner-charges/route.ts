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

    // Get charge transaction summaries from wallet_transactions table
    // This is where actual charges are stored (disbursement charges, SMS charges, etc.)
    const chargeConfigs = data || []
    
    // Debug: Log all charge configs fetched
    console.log(`📋 Fetched ${chargeConfigs.length} charge configs:`)
    chargeConfigs.forEach((config, idx) => {
      console.log(`   ${idx + 1}. ${config.charge_name} (${config.charge_type}) - Partner: ${config.partners?.name || 'N/A'} - ID: ${config.id}`)
    })
    
    // Validate: Ensure no duplicate charge types per partner (should be enforced by DB, but check anyway)
    const partnerChargeTypeMap: Record<string, Set<string>> = {}
    const duplicates: string[] = []
    
    chargeConfigs.forEach(config => {
      if (!partnerChargeTypeMap[config.partner_id]) {
        partnerChargeTypeMap[config.partner_id] = new Set()
      }
      if (partnerChargeTypeMap[config.partner_id].has(config.charge_type)) {
        duplicates.push(`${config.partners?.name || config.partner_id} - ${config.charge_type}`)
      }
      partnerChargeTypeMap[config.partner_id].add(config.charge_type)
    })
    
    if (duplicates.length > 0) {
      console.warn('⚠️ WARNING: Duplicate charge types found:', duplicates)
    }
    
    let transactionSummaries: Record<string, any> = {}

    if (chargeConfigs.length > 0) {
      // Get all partner IDs
      const partnerIds = Array.from(new Set(chargeConfigs.map(c => c.partner_id)))
      
      // Get all wallets for these partners
      const { data: wallets, error: walletsError } = await supabase
        .from('partner_wallets')
        .select('id, partner_id')
        .in('partner_id', partnerIds)

      if (!walletsError && wallets) {
        const walletIds = wallets.map(w => w.id)
        const walletPartnerMap = wallets.reduce((acc, wallet) => {
          acc[wallet.id] = wallet.partner_id
          return acc
        }, {} as Record<string, string>)

        // Fetch wallet transactions for these wallets
        // Single source of truth: match by charge_config_id in metadata for charges
        // For SMS charges: match by partner_id and transaction_type = 'sms_charge'
        // For float purchases: match by charge_config_id in metadata and transaction_type = 'b2c_float_purchase'
        // Order by created_at DESC to get newest transactions first, then limit to ensure we get all relevant ones
        const { data: walletTransactions, error: transactionsError } = await supabase
          .from('wallet_transactions')
          .select('id, wallet_id, transaction_type, amount, status, created_at, metadata, description')
          .in('wallet_id', walletIds)
          .in('transaction_type', ['charge', 'sms_charge', 'b2c_float_purchase'])
          .order('created_at', { ascending: false })
          .limit(10000) // Increased limit to ensure we capture all transactions

        if (!transactionsError && walletTransactions) {
          console.log(`📊 Found ${walletTransactions.length} wallet transactions to analyze`)
          console.log(`📊 Charge configs to match: ${chargeConfigs.length}`)
          
          // Get disbursement IDs from charge transactions to check their status
          const disbursementIds = walletTransactions
            .filter(t => {
              const metadata = t.metadata as any
              return metadata?.disbursement_id && t.transaction_type === 'charge'
            })
            .map(t => (t.metadata as any)?.disbursement_id)
            .filter((id): id is string => !!id)
          
          // Fetch disbursement statuses for charge transactions
          // Batch the query if there are too many IDs (Supabase has limits)
          let disbursementStatusMap: Record<string, string> = {}
          if (disbursementIds.length > 0) {
            const uniqueDisbursementIds = Array.from(new Set(disbursementIds))
            const BATCH_SIZE = 100 // Supabase query limit
            
            console.log(`📊 Fetching statuses for ${uniqueDisbursementIds.length} unique disbursements`)
            
            // Fetch in batches
            for (let i = 0; i < uniqueDisbursementIds.length; i += BATCH_SIZE) {
              const batch = uniqueDisbursementIds.slice(i, i + BATCH_SIZE)
              const { data: disbursements, error: disbursementsError } = await supabase
                .from('disbursement_requests')
                .select('id, status')
                .in('id', batch)
              
              if (!disbursementsError && disbursements) {
                disbursements.forEach(d => {
                  disbursementStatusMap[d.id] = d.status
                })
              } else if (disbursementsError) {
                console.error(`❌ Error fetching disbursement batch ${i / BATCH_SIZE + 1}:`, disbursementsError)
              }
            }
            
            const successCount = Object.values(disbursementStatusMap).filter(s => s === 'success').length
            console.log(`📊 Loaded ${Object.keys(disbursementStatusMap).length} disbursement statuses, ${successCount} with status 'success'`)
          }
          
          // Debug: Log sample transactions
          if (walletTransactions.length > 0) {
            console.log('📊 Sample transactions:', walletTransactions.slice(0, 5).map(t => ({
              id: t.id,
              wallet_id: t.wallet_id,
              partner_id: walletPartnerMap[t.wallet_id],
              transaction_type: t.transaction_type,
              amount: t.amount,
              status: t.status,
              description: t.description,
              metadata: t.metadata,
              disbursement_status: t.transaction_type === 'charge' && (t.metadata as any)?.disbursement_id 
                ? disbursementStatusMap[(t.metadata as any).disbursement_id] 
                : 'N/A'
            })))
          }
          
          // Debug: Log charge configs with duplicate check
          console.log('📊 Charge configs to match:', chargeConfigs.map(c => ({
            id: c.id,
            partner_id: c.partner_id,
            partner_name: c.partners?.name,
            charge_type: c.charge_type,
            charge_name: c.charge_name
          })))
          
          if (duplicates.length > 0) {
            console.warn('⚠️ Duplicate charge types detected:', duplicates)
          }
          
          // Group transactions by charge_config_id and charge_type
          chargeConfigs.forEach(chargeConfig => {
            const chargeTransactions = walletTransactions.filter(t => {
              const walletPartnerId = walletPartnerMap[t.wallet_id]
              
              if (!walletPartnerId || walletPartnerId !== chargeConfig.partner_id) {
                return false
              }
              
              // SINGLE SOURCE OF TRUTH: Match transactions by charge_config_id only
              // For SMS charges: match by charge_config_id in metadata (same as other charges)
              // All charges now use charge_config_id as the single source of truth
              // For backward compatibility: if charge_config_id is null, fall back to partner matching
              const metadata = t.metadata as any
              
              if (chargeConfig.charge_type === 'sms_charge') {
                // SMS charges: match by charge_config_id in metadata AND transaction_type = 'sms_charge'
                // If charge_config_id is null (backward compatibility), match by partner_id and transaction_type
                if (metadata?.charge_config_id !== null && metadata?.charge_config_id !== undefined) {
                  // New transactions with charge_config_id: match exactly
                  return t.transaction_type === 'sms_charge' && metadata?.charge_config_id === chargeConfig.id
                } else {
                  // Old transactions without charge_config_id: match by partner_id for backward compatibility
                  return t.transaction_type === 'sms_charge'
                }
              } else if (chargeConfig.charge_type === 'float_purchase') {
                // Float purchase charges: match by charge_config_id in metadata AND transaction_type = 'b2c_float_purchase'
                // The charge amount is stored in metadata.charges, not as a separate charge transaction
                return t.transaction_type === 'b2c_float_purchase' && metadata?.charge_config_id === chargeConfig.id
              } else {
                // For all other charges (disbursement, etc.): ONLY match by charge_config_id in metadata
                const hasChargeConfigId = metadata?.charge_config_id === chargeConfig.id
                
                if (!hasChargeConfigId || t.transaction_type !== 'charge') {
                  return false
                }
                
                // For disbursement charges: ONLY count if related disbursement has status 'success'
                // 'accepted' means M-Pesa accepted the request but hasn't completed yet (trial/pending)
                // 'success' means the disbursement was completed successfully
                if (chargeConfig.charge_type === 'disbursement' && metadata?.disbursement_id) {
                  const disbursementStatus = disbursementStatusMap[metadata.disbursement_id]
                  if (disbursementStatus !== 'success') {
                    return false
                  }
                }
                
                // For other charge types (non-disbursement), count all matching charges
                return true
              }
            })

            // Debug logging
            console.log(`📊 Charge Config: ${chargeConfig.charge_name} (${chargeConfig.charge_type}) - Partner: ${chargeConfig.partners?.name}`)
            console.log(`   Config ID: ${chargeConfig.id}, Partner ID: ${chargeConfig.partner_id}`)
            
            // Detailed debugging for this charge config
            const allMatchingCandidates = walletTransactions.filter(t => {
              const walletPartnerId = walletPartnerMap[t.wallet_id]
              return walletPartnerId === chargeConfig.partner_id
            })
            console.log(`   Total transactions for this partner: ${allMatchingCandidates.length}`)
            
            // Show ALL charge_config_id values found in transactions for this partner
            const allChargeConfigIds = allMatchingCandidates
              .filter(t => t.transaction_type === 'charge' || t.transaction_type === 'sms_charge' || t.transaction_type === 'b2c_float_purchase')
              .map(t => {
                const metadata = t.metadata as any
                return {
                  transaction_type: t.transaction_type,
                  charge_config_id: metadata?.charge_config_id
                }
              })
            
            const uniqueChargeConfigIds = Array.from(new Set(allChargeConfigIds.map(c => c.charge_config_id).filter((id): id is string => !!id)))
            console.log(`   Unique charge_config_id values found in transactions: ${uniqueChargeConfigIds.length}`)
            if (uniqueChargeConfigIds.length > 0) {
              console.log(`   Charge Config IDs in transactions:`, uniqueChargeConfigIds)
              console.log(`   Expected Charge Config ID: ${chargeConfig.id}`)
              console.log(`   Match: ${uniqueChargeConfigIds.includes(chargeConfig.id) ? '✅ YES' : '❌ NO'}`)
            }
            
            // Show SMS charge transactions specifically
            if (chargeConfig.charge_type === 'sms_charge') {
              const smsCharges = allMatchingCandidates.filter(t => t.transaction_type === 'sms_charge')
              console.log(`   📱 SMS Charge Transactions: ${smsCharges.length}`)
              smsCharges.forEach((smsCharge, idx) => {
                const metadata = smsCharge.metadata as any
                console.log(`      SMS Charge ${idx + 1}:`, {
                  id: smsCharge.id,
                  charge_config_id: metadata?.charge_config_id,
                  expected: chargeConfig.id,
                  matches: metadata?.charge_config_id === chargeConfig.id || (!metadata?.charge_config_id && chargeConfig.charge_type === 'sms_charge'),
                  description: smsCharge.description
                })
              })
            }
            
            const chargeCandidates = allMatchingCandidates.filter(t => {
              const metadata = t.metadata as any
              if (chargeConfig.charge_type === 'sms_charge') {
                // SMS charges: match by charge_config_id in metadata AND transaction_type = 'sms_charge'
                // If charge_config_id is null (backward compatibility), match by partner_id and transaction_type
                if (metadata?.charge_config_id !== null && metadata?.charge_config_id !== undefined) {
                  // New transactions with charge_config_id: match exactly
                  return t.transaction_type === 'sms_charge' && metadata?.charge_config_id === chargeConfig.id
                } else {
                  // Old transactions without charge_config_id: match by partner_id for backward compatibility
                  return t.transaction_type === 'sms_charge'
                }
              } else if (chargeConfig.charge_type === 'float_purchase') {
                // Float purchase charges: match by charge_config_id in metadata AND transaction_type = 'b2c_float_purchase'
                return t.transaction_type === 'b2c_float_purchase' && metadata?.charge_config_id === chargeConfig.id
              } else {
                // Other charges: match by charge_config_id in metadata AND transaction_type = 'charge'
                return metadata?.charge_config_id === chargeConfig.id && t.transaction_type === 'charge'
              }
            })
            console.log(`   Transactions matching charge_config_id: ${chargeCandidates.length}`)
            
            // Show which transactions matched
            if (chargeConfig.charge_type === 'sms_charge' && chargeCandidates.length > 0) {
              console.log(`   ✅ Matched SMS charges:`, chargeCandidates.map(c => ({
                id: c.id,
                amount: c.amount,
                description: c.description,
                charge_config_id: (c.metadata as any)?.charge_config_id
              })))
            }
            
            if (chargeConfig.charge_type === 'float_purchase' && chargeCandidates.length > 0) {
              console.log(`   ✅ Matched float purchase charges:`, chargeCandidates.map(c => {
                const metadata = c.metadata as any
                return {
                  id: c.id,
                  total_amount: c.amount,
                  float_amount: metadata?.float_amount,
                  charges: metadata?.charges,
                  description: c.description,
                  charge_config_id: metadata?.charge_config_id
                }
              }))
            }
            
            if (chargeConfig.charge_type === 'disbursement') {
              const withDisbursementId = chargeCandidates.filter(t => {
                const metadata = t.metadata as any
                return metadata?.disbursement_id
              })
              console.log(`   Charges with disbursement_id: ${withDisbursementId.length}`)
              
              const successfulDisbursements = withDisbursementId.filter(t => {
                const metadata = t.metadata as any
                const disbursementStatus = disbursementStatusMap[metadata.disbursement_id]
                return disbursementStatus === 'success'
              })
              console.log(`   Charges with success status: ${successfulDisbursements.length}`)
              
              // Show status breakdown
              const statusBreakdown: Record<string, number> = {}
              withDisbursementId.forEach(t => {
                const metadata = t.metadata as any
                const status = disbursementStatusMap[metadata.disbursement_id] || 'NOT_FOUND'
                statusBreakdown[status] = (statusBreakdown[status] || 0) + 1
              })
              console.log(`   Disbursement status breakdown:`, statusBreakdown)
              
              // Show sample metadata
              if (chargeCandidates.length > 0 && chargeCandidates[0]) {
                const sample = chargeCandidates[0]
                console.log(`   Sample charge metadata:`, JSON.stringify((sample.metadata as any), null, 2))
                if ((sample.metadata as any)?.disbursement_id) {
                  const dispStatus = disbursementStatusMap[(sample.metadata as any).disbursement_id]
                  console.log(`   Sample disbursement status: ${dispStatus || 'NOT FOUND'}`)
                }
              } else if (allMatchingCandidates.some(t => t.transaction_type === 'charge')) {
                // Show sample of charge transactions that don't match
                const nonMatching = allMatchingCandidates.filter(t => {
                  if (t.transaction_type !== 'charge') return false
                  const metadata = t.metadata as any
                  return metadata?.charge_config_id !== chargeConfig.id
                })
                if (nonMatching.length > 0) {
                  console.log(`   Sample non-matching charge (wrong charge_config_id):`, {
                    charge_config_id_in_transaction: (nonMatching[0].metadata as any)?.charge_config_id,
                    expected_charge_config_id: chargeConfig.id,
                    description: nonMatching[0].description
                  })
                }
              }
            }
            
            if (chargeTransactions.length > 0) {
              console.log(`✅ Final count: ${chargeTransactions.length} transactions`)
            } else {
              console.log(`⚠️ No transactions found for this charge config`)
            }

            // Calculate statistics
            // For float purchase charges: extract charge amount from metadata.charges (not transaction amount)
            // For other charges: amount is negative in wallet_transactions, so we use absolute value
            const totalAmount = chargeTransactions.reduce((sum, t) => {
              if (chargeConfig.charge_type === 'float_purchase') {
                // Float purchase: charge amount is stored in metadata.charges
                const metadata = t.metadata as any
                return sum + (metadata?.charges || 0)
              } else {
                // Other charges: amount is negative, so use absolute value
                return sum + Math.abs(t.amount || 0)
              }
            }, 0)
            
            transactionSummaries[chargeConfig.id] = {
            total_transactions: chargeTransactions.length,
              total_amount_collected: totalAmount,
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
            }).reduce((sum, t) => {
              if (chargeConfig.charge_type === 'float_purchase') {
                // Float purchase: charge amount is stored in metadata.charges
                const metadata = t.metadata as any
                return sum + (metadata?.charges || 0)
              } else {
                // Other charges: amount is negative, so use absolute value
                return sum + Math.abs(t.amount || 0)
              }
            }, 0)
          }
          
          // Debug: Log statistics stored for SMS charges
          if (chargeConfig.charge_type === 'sms_charge') {
            console.log(`📊 Stored statistics for SMS charge config ${chargeConfig.id}:`, transactionSummaries[chargeConfig.id])
          }
        })
        } else if (transactionsError) {
          console.error('❌ Error fetching wallet transactions:', transactionsError)
        } else {
          console.log('⚠️ No wallet transactions found')
        }
      }
    }

    // Transform data to include transaction summaries
    const transformedData = data?.map(charge => {
      const stats = transactionSummaries[charge.id] || {}
      const result = {
      ...charge,
      partner_name: charge.partners?.name,
      partner_active: charge.partners?.is_active,
        // Ensure all statistics fields have default values of 0 if no transactions exist
        total_transactions: stats.total_transactions || 0,
        total_amount_collected: stats.total_amount_collected || 0,
        completed_transactions: stats.completed_transactions || 0,
        pending_transactions: stats.pending_transactions || 0,
        failed_transactions: stats.failed_transactions || 0,
        today_transactions: stats.today_transactions || 0,
        today_amount: stats.today_amount || 0
      }
      
      // Debug: Log SMS charge statistics in final response
      if (charge.charge_type === 'sms_charge' && charge.partner_id === '550e8400-e29b-41d4-a716-446655440000') {
        console.log(`📊 Final SMS charge statistics for Kulman Group:`, {
          charge_id: charge.id,
          charge_name: charge.charge_name,
          total_transactions: result.total_transactions,
          total_amount_collected: result.total_amount_collected,
          stats_from_summaries: stats
        })
      }
      
      return result
    }) || []
    
    console.log(`✅ Returning ${transformedData.length} charge configs with statistics`)

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
      // Note: UNIQUE constraint on (partner_id, charge_type) ensures no duplicates
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
