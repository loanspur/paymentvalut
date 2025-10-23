import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('🔄 [Loan Polling] Starting automatic loan polling process...')
    
    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get all active partners with Mifos X configuration
    console.log('📋 [Loan Polling] Fetching partners with Mifos X configuration...')
    
    const { data: partners, error: partnersError } = await supabaseClient
      .from('partners')
      .select(`
        id,
        name,
        mifos_host_url,
        mifos_api_endpoint,
        mifos_username,
        mifos_password,
        mifos_tenant_id,
        is_active
      `)
      .eq('is_active', true)
      .not('mifos_host_url', 'is', null)
      .not('mifos_username', 'is', null)
      .not('mifos_password', 'is', null)

    if (partnersError) {
      console.error('❌ [Loan Polling] Error fetching partners:', partnersError.message)
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Failed to fetch partners',
          details: partnersError.message 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    if (!partners || partners.length === 0) {
      console.log('✅ [Loan Polling] No active partners with Mifos X configuration found')
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No active partners with Mifos X configuration found',
          partners_checked: 0,
          loans_found: 0,
          loans_processed: 0
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log(`🔄 [Loan Polling] Found ${partners.length} active partners with Mifos X configuration`)

    const pollingResults = []
    let totalLoansFound = 0
    let totalLoansProcessed = 0

    // Process each partner
    for (const partner of partners) {
      console.log(`\n🏢 [Loan Polling] Processing partner: ${partner.name}`)
      
      try {
        const partnerResult = await pollPartnerLoans(supabaseClient, partner)
        pollingResults.push(partnerResult)
        totalLoansFound += partnerResult.loans_found
        totalLoansProcessed += partnerResult.loans_processed
      } catch (error) {
        console.error(`❌ [Loan Polling] Error processing partner ${partner.name}:`, error.message)
        pollingResults.push({
          partner_id: partner.id,
          partner_name: partner.name,
          success: false,
          error: error.message,
          loans_found: 0,
          loans_processed: 0
        })
      }
    }

    console.log(`\n📊 [Loan Polling] Polling process completed:`)
    console.log(`   Partners processed: ${partners.length}`)
    console.log(`   Total loans found: ${totalLoansFound}`)
    console.log(`   Total loans processed: ${totalLoansProcessed}`)

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Loan polling process completed',
        partners_checked: partners.length,
        loans_found: totalLoansFound,
        loans_processed: totalLoansProcessed,
        results: pollingResults
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('❌ [Loan Polling] Critical error in polling process:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Critical error in loan polling process',
        details: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})

async function pollPartnerLoans(supabaseClient: any, partner: any) {
  const partnerId = partner.id
  const partnerName = partner.name
  
  console.log(`   🔍 [${partnerName}] Fetching pending loans from Mifos X...`)

  try {
    // Prepare Mifos X API URL
    const mifosBaseUrl = `${partner.mifos_host_url}${partner.mifos_api_endpoint || '/fineract-provider/api/v1'}`
    const loansUrl = `${mifosBaseUrl}/loans?status=200&limit=100` // Status 200 = Approved, waiting for disbursal

    // Create Basic Auth header
    const basicAuth = btoa(`${partner.mifos_username}:${partner.mifos_password}`)

    console.log(`   📡 [${partnerName}] Calling Mifos X API: ${loansUrl}`)

    // Fetch loans from Mifos X
    const response = await fetch(loansUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Fineract-Platform-TenantId': partner.mifos_tenant_id || 'default',
        'Authorization': `Basic ${basicAuth}`
      }
    })

    if (!response.ok) {
      throw new Error(`Mifos X API error: ${response.status} ${response.statusText}`)
    }

    const loansData = await response.json()
    const loans = loansData.pageItems || []

    console.log(`   📋 [${partnerName}] Found ${loans.length} approved loans`)

    if (loans.length === 0) {
      return {
        partner_id: partnerId,
        partner_name: partnerName,
        success: true,
        loans_found: 0,
        loans_processed: 0,
        message: 'No approved loans found'
      }
    }

    // Filter loans that are waiting for disbursal
    const pendingLoans = loans.filter((loan: any) => 
      loan.status?.id === 200 && 
      loan.status?.waitingForDisbursal === true
    )

    console.log(`   ⏳ [${partnerName}] Found ${pendingLoans.length} loans waiting for disbursal`)

    if (pendingLoans.length === 0) {
      return {
        partner_id: partnerId,
        partner_name: partnerName,
        success: true,
        loans_found: loans.length,
        loans_processed: 0,
        message: 'No loans waiting for disbursal'
      }
    }

    // Process each pending loan
    let processedCount = 0
    for (const loan of pendingLoans) {
      try {
        await processPendingLoan(supabaseClient, partner, loan)
        processedCount++
        console.log(`   ✅ [${partnerName}] Processed loan ${loan.id}`)
      } catch (error) {
        console.error(`   ❌ [${partnerName}] Error processing loan ${loan.id}:`, error.message)
      }
    }

    return {
      partner_id: partnerId,
      partner_name: partnerName,
      success: true,
      loans_found: loans.length,
      loans_processed: processedCount,
      pending_loans: pendingLoans.length,
      message: `Processed ${processedCount} of ${pendingLoans.length} pending loans`
    }

  } catch (error) {
    console.error(`   ❌ [${partnerName}] Error fetching loans:`, error.message)
    throw error
  }
}

async function processPendingLoan(supabaseClient: any, partner: any, loan: any) {
  // Check if loan already exists in tracking table
  const { data: existingLoan, error: checkError } = await supabaseClient
    .from('loan_tracking')
    .select('id')
    .eq('loan_id', loan.id)
    .eq('partner_id', partner.id)
    .single()

  if (checkError && checkError.code !== 'PGRST116') {
    throw new Error(`Error checking existing loan: ${checkError.message}`)
  }

  if (existingLoan) {
    console.log(`   ⚠️ [${partner.name}] Loan ${loan.id} already exists in tracking table`)
    return
  }

  // Get client details
  const clientId = loan.clientId
  const clientName = loan.clientName || 'Unknown Client'
  
  // Get phone number from client data or loan data
  let phoneNumber = null
  if (loan.clientData && loan.clientData.mobileNo) {
    phoneNumber = loan.clientData.mobileNo
  } else if (loan.clientData && loan.clientData.phoneNo) {
    phoneNumber = loan.clientData.phoneNo
  }

  // Create loan tracking record
  const loanTrackingData = {
    partner_id: partner.id,
    loan_id: loan.id,
    client_id: clientId,
    client_name: clientName,
    loan_amount: loan.principal || loan.approvedPrincipal || 0,
    phone_number: phoneNumber,
    status: 'pending_disbursement',
    disbursement_status: 'pending',
    mifos_status_id: loan.status?.id || 200,
    mifos_status_value: loan.status?.value || 'Approved',
    waiting_for_disbursal: loan.status?.waitingForDisbursal || true,
    loan_product_id: loan.loanProductId,
    loan_product_name: loan.loanProductName,
    approved_date: loan.timeline?.approvedOnDate ? new Date(loan.timeline.approvedOnDate.join('-')).toISOString() : null,
    expected_disbursement_date: loan.timeline?.expectedDisbursementDate ? new Date(loan.timeline.expectedDisbursementDate.join('-')).toISOString() : null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }

  const { data: trackingRecord, error: insertError } = await supabaseClient
    .from('loan_tracking')
    .insert(loanTrackingData)
    .select()
    .single()

  if (insertError) {
    throw new Error(`Error creating loan tracking record: ${insertError.message}`)
  }

  console.log(`   📝 [${partner.name}] Created tracking record for loan ${loan.id}`)

  // Check if auto-disbursal is configured for this loan product
  const { data: autoDisbursalConfig, error: configError } = await supabaseClient
    .from('loan_product_auto_disbursal_configs')
    .select('*')
    .eq('partner_id', partner.id)
    .eq('product_id', loan.loanProductId)
    .eq('enabled', true)
    .single()

  if (configError && configError.code !== 'PGRST116') {
    console.error(`   ⚠️ [${partner.name}] Error checking auto-disbursal config: ${configError.message}`)
  }

  if (autoDisbursalConfig) {
    console.log(`   🚀 [${partner.name}] Auto-disbursal configured for loan ${loan.id}`)
    
    // Trigger automatic disbursement
    try {
      await triggerAutoDisbursement(supabaseClient, partner, loan, trackingRecord)
    } catch (disbursementError) {
      console.error(`   ❌ [${partner.name}] Error triggering auto-disbursement: ${disbursementError.message}`)
    }
  } else {
    console.log(`   ⏳ [${partner.name}] No auto-disbursal config for loan ${loan.id} - manual processing required`)
  }
}

async function triggerAutoDisbursement(supabaseClient: any, partner: any, loan: any, trackingRecord: any) {
  // Check if partner has M-Pesa configuration
  const { data: partnerConfig, error: configError } = await supabaseClient
    .from('partners')
    .select('mpesa_shortcode, mpesa_passkey, mpesa_consumer_key, mpesa_consumer_secret')
    .eq('id', partner.id)
    .single()

  if (configError || !partnerConfig) {
    throw new Error('Partner M-Pesa configuration not found')
  }

  // Check if phone number is available
  if (!trackingRecord.phone_number) {
    throw new Error('Phone number not available for disbursement')
  }

  // Prepare disbursement data
  const disbursementData = {
    partner_id: partner.id,
    tenant_id: partner.mifos_tenant_id || 'default',
    msisdn: trackingRecord.phone_number,
    amount: trackingRecord.loan_amount,
    customer_id: trackingRecord.client_id.toString(),
    client_request_id: `auto_${trackingRecord.loan_id}_${Date.now()}`,
    external_reference: trackingRecord.loan_id.toString(),
    origin: 'auto_polling',
    description: `Auto-disbursement for loan ${trackingRecord.loan_id}`,
    currency: 'KES'
  }

  console.log(`   💰 [${partner.name}] Triggering auto-disbursement for loan ${loan.id}`)

  // Call the disbursement function
  const response = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/disburse`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
      'x-api-key': partner.api_key || 'auto-polling'
    },
    body: JSON.stringify(disbursementData)
  })

  const result = await response.json()

  if (response.ok && result.status === 'accepted') {
    console.log(`   ✅ [${partner.name}] Auto-disbursement successful for loan ${loan.id}`)
    
    // Update tracking record
    await supabaseClient
      .from('loan_tracking')
      .update({
        status: 'disbursed',
        disbursement_status: 'completed',
        disbursement_id: result.disbursement_id,
        conversation_id: result.conversation_id,
        updated_at: new Date().toISOString()
      })
      .eq('id', trackingRecord.id)
  } else {
    console.error(`   ❌ [${partner.name}] Auto-disbursement failed for loan ${loan.id}:`, result.error)
    
    // Update tracking record with error
    await supabaseClient
      .from('loan_tracking')
      .update({
        status: 'disbursement_failed',
        disbursement_status: 'failed',
        error_message: result.error || 'Auto-disbursement failed',
        updated_at: new Date().toISOString()
      })
      .eq('id', trackingRecord.id)
  }
}
