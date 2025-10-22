import { NextRequest, NextResponse } from 'next/server'
import { verifyJWTToken } from '../../../../lib/jwt-utils'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const token = request.cookies.get('auth_token')?.value
    if (!token) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const payload = await verifyJWTToken(token)
    if (!payload) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 })
    }

    // Get user's partner information
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('partner_id')
      .eq('id', payload.userId)
      .single()

    if (userError || !userData?.partner_id) {
      return NextResponse.json({ error: 'Partner not found' }, { status: 404 })
    }

    // Get auto-disbursal configurations for this partner
    const { data: configs, error: configsError } = await supabase
      .from('loan_product_auto_disbursal_configs')
      .select('*')
      .eq('partner_id', userData.partner_id)

    if (configsError) {
      console.error('Error fetching auto-disbursal configs:', configsError)
      return NextResponse.json({ error: 'Failed to fetch configurations' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      configs: configs || []
    })

  } catch (error) {
    console.error('Error fetching auto-disbursal configs:', error)
    return NextResponse.json({
      error: 'Failed to fetch auto-disbursal configurations',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const token = request.cookies.get('auth_token')?.value
    if (!token) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const payload = await verifyJWTToken(token)
    if (!payload) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 })
    }

    // Get user's partner information
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('partner_id')
      .eq('id', payload.userId)
      .single()

    if (userError || !userData?.partner_id) {
      return NextResponse.json({ error: 'Partner not found' }, { status: 404 })
    }

    const configData = await request.json()

    // Validate required fields
    if (!configData.productId || !configData.productName) {
      return NextResponse.json({
        error: 'Missing required fields: productId, productName'
      }, { status: 400 })
    }

    // Check if configuration already exists
    const { data: existingConfig, error: checkError } = await supabase
      .from('loan_product_auto_disbursal_configs')
      .select('id')
      .eq('partner_id', userData.partner_id)
      .eq('product_id', configData.productId)
      .single()

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('Error checking existing config:', checkError)
      return NextResponse.json({ error: 'Failed to check existing configuration' }, { status: 500 })
    }

    const configRecord = {
      partner_id: userData.partner_id,
      product_id: configData.productId,
      product_name: configData.productName,
      enabled: configData.enabled || false,
      max_amount: configData.maxAmount || 0,
      min_amount: configData.minAmount || 0,
      requires_approval: configData.requiresApproval || false,
      updated_at: new Date().toISOString()
    }

    let result
    if (existingConfig) {
      // Update existing configuration
      const { data, error } = await supabase
        .from('loan_product_auto_disbursal_configs')
        .update(configRecord)
        .eq('id', existingConfig.id)
        .select()
        .single()

      if (error) {
        console.error('Error updating auto-disbursal config:', error)
        return NextResponse.json({ error: 'Failed to update configuration' }, { status: 500 })
      }
      result = data
    } else {
      // Create new configuration
      const { data, error } = await supabase
        .from('loan_product_auto_disbursal_configs')
        .insert({
          ...configRecord,
          created_at: new Date().toISOString()
        })
        .select()
        .single()

      if (error) {
        console.error('Error creating auto-disbursal config:', error)
        return NextResponse.json({ error: 'Failed to create configuration' }, { status: 500 })
      }
      result = data
    }

    return NextResponse.json({
      success: true,
      config: result,
      message: existingConfig ? 'Configuration updated successfully' : 'Configuration created successfully'
    })

  } catch (error) {
    console.error('Error saving auto-disbursal config:', error)
    return NextResponse.json({
      error: 'Failed to save auto-disbursal configuration',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

