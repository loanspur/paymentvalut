import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase environment variables')
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Trigger balance check using existing Edge Functions
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { partner_id, all_tenants } = body

    console.log(`🔄 [Balance Trigger] Request received:`, { partner_id, all_tenants })

    // Get the Supabase project URL from environment
    if (!supabaseUrl) {
      return NextResponse.json(
        { error: 'Supabase URL not configured' },
        { status: 500 }
      )
    }

    const edgeFunctionUrl = `${supabaseUrl}/functions/v1/balance-monitor`

    let results = []

    if (all_tenants) {
      // Get all active partners with M-Pesa configuration
      const { data: partners, error: partnersError } = await supabase
        .from('partners')
        .select('id, name, short_code')
        .eq('is_active', true)
        .eq('is_mpesa_configured', true)

      if (partnersError) {
        console.error('❌ [Balance Trigger] Error fetching partners:', partnersError)
        return NextResponse.json(
          { error: 'Failed to fetch partners' },
          { status: 500 }
        )
      }

      if (!partners || partners.length === 0) {
        return NextResponse.json({
          success: true,
          message: 'No active partners found',
          results: []
        })
      }

      console.log(`📊 [Balance Trigger] Triggering balance checks for ${partners.length} partners`)

      // Trigger balance check for each partner
      const balanceCheckPromises = partners.map(async (partner) => {
        try {
          console.log(`🔄 [Balance Trigger] Triggering balance check for partner ${partner.id} (${partner.name})`)
          
             const response = await fetch(edgeFunctionUrl, {
               method: 'POST',
               headers: {
                 'Content-Type': 'application/json',
                 'Authorization': `Bearer ${supabaseServiceKey}`,
               },
               body: JSON.stringify({
                 partner_id: partner.id,
                 force_check: true
               })
             })

          const responseData = await response.json()

          if (!response.ok) {
            console.error(`❌ [Balance Trigger] Error for partner ${partner.id}:`, responseData)
            return {
              partner_id: partner.id,
              partner_name: partner.name,
              success: false,
              error: responseData.error || 'Unknown error',
              status: response.status
            }
          }

          console.log(`✅ [Balance Trigger] Success for partner ${partner.id}:`, responseData)
          return {
            partner_id: partner.id,
            partner_name: partner.name,
            success: true,
            data: responseData
          }
        } catch (error: any) {
          console.error(`❌ [Balance Trigger] Exception for partner ${partner.id}:`, error)
          return {
            partner_id: partner.id,
            partner_name: partner.name,
            success: false,
            error: error.message
          }
        }
      })

      results = await Promise.all(balanceCheckPromises)

    } else if (partner_id) {
      // Single partner balance check
      console.log(`🔄 [Balance Trigger] Triggering balance check for partner ${partner_id}`)

             const response = await fetch(edgeFunctionUrl, {
               method: 'POST',
               headers: {
                 'Content-Type': 'application/json',
                 'Authorization': `Bearer ${supabaseServiceKey}`,
               },
               body: JSON.stringify({
                 partner_id: partner_id,
                 force_check: true
               })
             })

      const responseData = await response.json()

      if (!response.ok) {
        console.error('❌ [Balance Trigger] Edge Function error:', responseData)
        return NextResponse.json(
          { 
            error: 'Failed to trigger balance check',
            details: responseData.error || 'Unknown error',
            status: response.status
          },
          { status: response.status }
        )
      }

      console.log('✅ [Balance Trigger] Balance check triggered successfully:', responseData)
      results = [{
        partner_id: partner_id,
        success: true,
        data: responseData
      }]

    } else {
      return NextResponse.json(
        { error: 'Either partner_id or all_tenants=true is required' },
        { status: 400 }
      )
    }

    const successCount = results.filter(r => r.success).length
    const failureCount = results.filter(r => !r.success).length

    return NextResponse.json({
      success: true,
      message: `Balance checks completed: ${successCount} successful, ${failureCount} failed`,
      results: results,
      summary: {
        total: results.length,
        successful: successCount,
        failed: failureCount
      }
    })

  } catch (error: any) {
    console.error('❌ [Balance Trigger] Error:', error)
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
