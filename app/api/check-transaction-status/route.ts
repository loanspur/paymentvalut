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
    console.log('🔍 Checking transaction status...')
    
    // Simple test first
    return NextResponse.json({
      message: 'Transaction status API is working',
      timestamp: new Date().toISOString(),
      test: 'success'
    })

  } catch (error) {
    console.error('❌ Transaction status check failed:', error)
    return NextResponse.json({
      error: 'Transaction status check failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
