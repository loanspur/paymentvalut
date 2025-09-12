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
    console.log('🔍 Checking RLS policies and table access...')
    
    // Check if we can access the tables with service role
    const results = {
      disbursement_requests: { accessible: false, error: null },
      mpesa_callbacks: { accessible: false, error: null },
      partners: { accessible: false, error: null }
    }
    
    // Test disbursement_requests table access
    try {
      const { data, error } = await supabase
        .from('disbursement_requests')
        .select('id, status, conversation_id')
        .limit(1)
      
      if (error) {
        results.disbursement_requests.error = error.message
      } else {
        results.disbursement_requests.accessible = true
      }
    } catch (err) {
      results.disbursement_requests.error = err instanceof Error ? err.message : 'Unknown error'
    }
    
    // Test mpesa_callbacks table access
    try {
      const { data, error } = await supabase
        .from('mpesa_callbacks')
        .select('id, conversation_id')
        .limit(1)
      
      if (error) {
        results.mpesa_callbacks.error = error.message
      } else {
        results.mpesa_callbacks.accessible = true
      }
    } catch (err) {
      results.mpesa_callbacks.error = err instanceof Error ? err.message : 'Unknown error'
    }
    
    // Test partners table access
    try {
      const { data, error } = await supabase
        .from('partners')
        .select('id, name')
        .limit(1)
      
      if (error) {
        results.partners.error = error.message
      } else {
        results.partners.accessible = true
      }
    } catch (err) {
      results.partners.error = err instanceof Error ? err.message : 'Unknown error'
    }
    
    // Try to insert a test callback to see if RLS blocks it
    let testInsert = { success: false, error: null }
    try {
      const { data, error } = await supabase
        .from('mpesa_callbacks')
        .insert({
          callback_type: 'result',
          conversation_id: 'TEST_RLS_CHECK',
          result_code: '0',
          result_desc: 'RLS Test',
          raw_callback_data: { test: true }
        })
        .select()
        .single()
      
      if (error) {
        testInsert.error = error.message
      } else {
        testInsert.success = true
        // Clean up the test record
        await supabase
          .from('mpesa_callbacks')
          .delete()
          .eq('id', data.id)
      }
    } catch (err) {
      testInsert.error = err instanceof Error ? err.message : 'Unknown error'
    }
    
    const response = {
      message: 'RLS and table access check completed',
      table_access: results,
      test_insert: testInsert,
      timestamp: new Date().toISOString()
    }
    
    return NextResponse.json(response)
    
  } catch (error) {
    console.error('❌ Error:', error)
    return NextResponse.json({
      error: 'Failed to check RLS',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
