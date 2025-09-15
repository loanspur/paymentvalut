import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '../../../../lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const conversationId = searchParams.get('conversation_id')
    const transactionId = searchParams.get('transaction_id')
    const hours = parseInt(searchParams.get('hours') || '24')

    let query = supabase
      .from('mpesa_callbacks')
      .select('*')
      .order('created_at', { ascending: false })

    if (conversationId) {
      query = query.eq('conversation_id', conversationId)
    } else if (transactionId) {
      query = query.eq('transaction_id', transactionId)
    } else {
      // Default to last 24 hours
      const cutoffTime = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString()
      query = query.gte('created_at', cutoffTime)
    }

    const { data: callbacks, error } = await query

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch callback logs', details: error.message },
        { status: 500 }
      )
    }

    // Also get callback statistics
    const { data: stats } = await supabase
      .from('mpesa_callbacks')
      .select('callback_type')
      .gte('created_at', new Date(Date.now() - hours * 60 * 60 * 1000).toISOString())

    const callbackStats = stats?.reduce((acc: any, callback: any) => {
      acc[callback.callback_type] = (acc[callback.callback_type] || 0) + 1
      return acc
    }, {}) || {}

    return NextResponse.json({
      success: true,
      callbacks: callbacks || [],
      stats: callbackStats,
      total: callbacks?.length || 0,
      query_params: {
        conversation_id: conversationId,
        transaction_id: transactionId,
        hours: hours
      }
    })

  } catch (error) {
    console.error('Error fetching callback logs:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

