import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase environment variables')
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Checking latest disbursement for balance data...')
    
    // Get the latest disbursements for Kulman
    const { data: disbursements, error } = await supabase
      .from('disbursement_requests')
      .select('*')
      .eq('partner_id', '550e8400-e29b-41d4-a716-446655440000')
      .order('created_at', { ascending: false })
      .limit(5)
    
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    
    const response = {
      message: `Found ${disbursements.length} disbursements for Kulman`,
      disbursements: disbursements.map(disbursement => ({
        id: disbursement.id,
        amount: disbursement.amount,
        msisdn: disbursement.msisdn,
        status: disbursement.status,
        created_at: disbursement.created_at,
        balance_data: {
          working_account_balance: disbursement.mpesa_working_account_balance,
          utility_account_balance: disbursement.mpesa_utility_account_balance,
          charges_account_balance: disbursement.mpesa_charges_account_balance,
          balance_updated_at: disbursement.balance_updated_at
        }
      }))
    }
    
    return NextResponse.json(response)
    
  } catch (error) {
    console.error('❌ Error:', error)
    return NextResponse.json({
      error: 'Failed to check disbursement',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
