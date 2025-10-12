import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase environment variables')
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Insert real balance data for a partner
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      partner_id,
      partner_name,
      utility_balance,
      working_balance,
      charges_balance,
      source = 'auto_fetched'
    } = body

    if (!partner_id || utility_balance === undefined) {
      return NextResponse.json(
        { error: 'Partner ID and utility balance are required' },
        { status: 400 }
      )
    }

    // Inserting real balance data

    // Insert into balance_requests table
    const { data: balanceRequest, error: balanceError } = await supabase
      .from('balance_requests')
      .insert({
        partner_id,
        conversation_id: `REAL_BALANCE_${partner_id}_${Date.now()}`,
        request_type: 'balance_inquiry',
        shortcode: 'auto_fetched',
        initiator_name: `Auto-fetched from ${source}`,
        status: 'completed',
        result_code: '0',
        result_desc: 'Success - Auto-fetched real balance',
        utility_account_balance: utility_balance,
        working_account_balance: working_balance || null,
        charges_account_balance: charges_balance || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (balanceError) {
      console.error('Error inserting balance request:', balanceError)
      return NextResponse.json(
        { error: 'Failed to insert balance request', details: balanceError.message },
        { status: 500 }
      )
    }

    // Also insert into balance_checks table for consistency
    const { data: balanceCheck, error: checkError } = await supabase
      .from('balance_checks')
      .insert({
        partner_id,
        shortcode: 'auto_fetched',
        balance_amount: utility_balance,
        balance_currency: 'KES',
        check_timestamp: new Date().toISOString(),
        response_status: 'success',
        created_at: new Date().toISOString()
      })
      .select()
      .single()

    if (checkError) {
      console.error('Error inserting balance check:', checkError)
      // Don't fail the entire operation if this fails
    }

    // Successfully inserted real balance data

    return NextResponse.json({
      success: true,
      message: `Real balance data inserted for ${partner_name}`,
      balance_request: balanceRequest,
      balance_check: balanceCheck,
      balance_data: {
        utility_balance,
        working_balance,
        charges_balance,
        source
      }
    })

  } catch (error) {
    console.error('Error inserting real balance data:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}
