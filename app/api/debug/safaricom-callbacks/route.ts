import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '5')
    const hours = parseInt(searchParams.get('hours') || '24')

    // Get recent M-Pesa callbacks with raw data
    const cutoffTime = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString()
    
    const { data: callbacks, error } = await supabase
      .from('mpesa_callbacks')
      .select('*')
      .eq('callback_type', 'result')
      .gte('created_at', cutoffTime)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('Error fetching callbacks:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Parse and extract the raw callback data
    const parsedCallbacks = callbacks?.map(callback => {
      let rawData = null
      let resultParameters = null
      let extractedNames = []

      try {
        // Parse the raw callback data
        rawData = typeof callback.raw_callback_data === 'string' 
          ? JSON.parse(callback.raw_callback_data) 
          : callback.raw_callback_data

        // Extract ResultParameters
        if (rawData?.Result?.ResultParameters?.ResultParameter) {
          resultParameters = rawData.Result.ResultParameters.ResultParameter
          
          // Look for name-related fields
          resultParameters.forEach((param: any) => {
            if (param.Key && param.Value) {
              // Check for various name fields that might contain customer names
              if (param.Key.toLowerCase().includes('name') || 
                  param.Key.toLowerCase().includes('party') ||
                  param.Key.toLowerCase().includes('recipient') ||
                  param.Key.toLowerCase().includes('customer')) {
                extractedNames.push({
                  key: param.Key,
                  value: param.Value
                })
              }
            }
          })
        }
      } catch (parseError) {
        console.error('Error parsing raw callback data:', parseError)
      }

      return {
        id: callback.id,
        conversation_id: callback.conversation_id,
        transaction_id: callback.transaction_id,
        result_code: callback.result_code,
        result_desc: callback.result_desc,
        receipt_number: callback.receipt_number,
        transaction_amount: callback.transaction_amount,
        created_at: callback.created_at,
        raw_callback_data: rawData,
        result_parameters: resultParameters,
        extracted_names: extractedNames,
        all_parameters: resultParameters?.map((p: any) => ({ key: p.Key, value: p.Value })) || []
      }
    }) || []

    return NextResponse.json({
      success: true,
      callbacks: parsedCallbacks,
      total: callbacks?.length || 0,
      query_params: {
        limit,
        hours
      }
    })

  } catch (error) {
    console.error('Error in debug API:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
