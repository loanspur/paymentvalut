import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '10')
    const status = searchParams.get('status')
    
    let query = supabaseAdmin
      .from('disbursement_requests')
      .select(`
        *,
        partners:partner_id (
          name,
          mpesa_shortcode,
          mpesa_environment
        )
      `)
      .order('created_at', { ascending: false })
      .limit(limit)
    
    if (status) {
      query = query.eq('status', status)
    }
    
    const { data: disbursements, error } = await query
    
    if (error) {
      console.error('Error fetching disbursement logs:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to fetch disbursement logs' },
        { status: 500 }
      )
    }
    
    // Format the response for Safaricom support
    const formattedLogs = disbursements?.map(disbursement => ({
      disbursementId: disbursement.id,
      status: disbursement.status,
      amount: disbursement.amount,
      msisdn: disbursement.msisdn,
      conversationId: disbursement.conversation_id,
      resultCode: disbursement.result_code,
      resultDesc: disbursement.result_desc,
      partner: disbursement.partners?.name,
      mpesaShortcode: disbursement.partners?.mpesa_shortcode,
      environment: disbursement.partners?.mpesa_environment,
      createdAt: disbursement.created_at,
      updatedAt: disbursement.updated_at,
      clientRequestId: disbursement.client_request_id,
      tenantId: disbursement.tenant_id,
      customerId: disbursement.customer_id
    })) || []
    
    return NextResponse.json({
      success: true,
      logs: formattedLogs,
      total: formattedLogs.length,
      message: 'Disbursement logs retrieved successfully'
    })
    
  } catch (error) {
    console.error('Exception fetching disbursement logs:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch disbursement logs' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const { disbursementId } = await request.json()
    
    if (!disbursementId) {
      return NextResponse.json(
        { success: false, error: 'Disbursement ID is required' },
        { status: 400 }
      )
    }
    
    // Get detailed logs for a specific disbursement
    const { data: disbursement, error } = await supabaseAdmin
      .from('disbursement_requests')
      .select(`
        *,
        partners:partner_id (
          name,
          mpesa_shortcode,
          mpesa_environment,
          mpesa_consumer_key,
          mpesa_initiator_name
        )
      `)
      .eq('id', disbursementId)
      .single()
    
    if (error || !disbursement) {
      return NextResponse.json(
        { success: false, error: 'Disbursement not found' },
        { status: 404 }
      )
    }
    
    // Format detailed response for Safaricom support
    const detailedLog = {
      disbursementId: disbursement.id,
      status: disbursement.status,
      amount: disbursement.amount,
      msisdn: disbursement.msisdn,
      conversationId: disbursement.conversation_id,
      resultCode: disbursement.result_code,
      resultDesc: disbursement.result_desc,
      partner: {
        name: disbursement.partners?.name,
        mpesaShortcode: disbursement.partners?.mpesa_shortcode,
        environment: disbursement.partners?.mpesa_environment,
        consumerKey: disbursement.partners?.mpesa_consumer_key?.substring(0, 10) + '...',
        initiatorName: disbursement.partners?.mpesa_initiator_name
      },
      timestamps: {
        createdAt: disbursement.created_at,
        updatedAt: disbursement.updated_at,
        balanceUpdatedAt: disbursement.balance_updated_at
      },
      requestDetails: {
        clientRequestId: disbursement.client_request_id,
        tenantId: disbursement.tenant_id,
        customerId: disbursement.customer_id,
        origin: disbursement.origin
      },
      mpesaDetails: {
        mpesaShortcode: disbursement.mpesa_shortcode,
        partnerShortcodeId: disbursement.partner_shortcode_id
      }
    }
    
    return NextResponse.json({
      success: true,
      disbursement: detailedLog,
      message: 'Detailed disbursement log retrieved successfully'
    })
    
  } catch (error) {
    console.error('Exception fetching detailed disbursement log:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch detailed disbursement log' },
      { status: 500 }
    )
  }
}
