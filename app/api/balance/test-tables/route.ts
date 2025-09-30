import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase environment variables')
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Test if balance monitoring tables exist and are accessible
export async function GET(request: NextRequest) {
  try {
    const results: any = {
      timestamp: new Date().toISOString(),
      tables: {},
      errors: []
    }

    // Test balance_monitoring_config table
    try {
      const { data, error } = await supabase
        .from('balance_monitoring_config')
        .select('count')
        .limit(1)
      
      results.tables.balance_monitoring_config = {
        exists: true,
        accessible: !error,
        error: error?.message || null,
        count: data?.length || 0
      }
    } catch (error) {
      results.tables.balance_monitoring_config = {
        exists: false,
        accessible: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
      results.errors.push(`balance_monitoring_config: ${error}`)
    }

    // Test balance_alerts table
    try {
      const { data, error } = await supabase
        .from('balance_alerts')
        .select('count')
        .limit(1)
      
      results.tables.balance_alerts = {
        exists: true,
        accessible: !error,
        error: error?.message || null,
        count: data?.length || 0
      }
    } catch (error) {
      results.tables.balance_alerts = {
        exists: false,
        accessible: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
      results.errors.push(`balance_alerts: ${error}`)
    }

    // Test partners table
    try {
      const { data, error } = await supabase
        .from('partners')
        .select('id, name')
        .limit(5)
      
      results.tables.partners = {
        exists: true,
        accessible: !error,
        error: error?.message || null,
        count: data?.length || 0,
        sample: data?.map(p => ({ id: p.id, name: p.name })) || []
      }
    } catch (error) {
      results.tables.partners = {
        exists: false,
        accessible: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
      results.errors.push(`partners: ${error}`)
    }

    // Test environment variables
    results.environment = {
      supabaseUrl: supabaseUrl ? 'Set' : 'Missing',
      supabaseServiceKey: supabaseServiceKey ? 'Set' : 'Missing'
    }

    const hasErrors = results.errors.length > 0
    const status = hasErrors ? 500 : 200

    return NextResponse.json({
      success: !hasErrors,
      message: hasErrors ? 'Some tables are missing or inaccessible' : 'All tables are accessible',
      ...results
    }, { status })

  } catch (error) {
    console.error('Error testing tables:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to test tables',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}
