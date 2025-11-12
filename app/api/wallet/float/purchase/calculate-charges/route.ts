import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const amount = parseFloat(searchParams.get('amount') || '0')
    const partnerId = searchParams.get('partner_id')

    if (!amount || amount < 1) {
      return NextResponse.json(
        { success: false, error: 'Valid amount is required' },
        { status: 400 }
      )
    }

    if (!partnerId) {
      return NextResponse.json(
        { success: false, error: 'Partner ID is required' },
        { status: 400 }
      )
    }

    // Get partner charges for float purchase
    const { data: chargeConfig, error: chargeError } = await supabase
      .from('partner_charges_config')
      .select('*')
      .eq('partner_id', partnerId)
      .eq('charge_type', 'float_purchase')
      .eq('is_active', true)
      .single()

    // Calculate total cost including charges
    let totalCharges = 0
    let chargeName = 'Float Purchase Fee'
    
    if (chargeConfig && chargeConfig.is_automatic) {
      chargeName = chargeConfig.charge_name || chargeName
      totalCharges = chargeConfig.charge_amount || 0
      
      // Apply percentage if specified
      if (chargeConfig.charge_percentage) {
        const percentageAmount = (amount * chargeConfig.charge_percentage) / 100
        totalCharges = Math.max(totalCharges, percentageAmount)
      }
      
      // Apply minimum and maximum limits
      if (chargeConfig.minimum_charge && totalCharges < chargeConfig.minimum_charge) {
        totalCharges = chargeConfig.minimum_charge
      }
      if (chargeConfig.maximum_charge && totalCharges > chargeConfig.maximum_charge) {
        totalCharges = chargeConfig.maximum_charge
      }
    }

    const totalCost = amount + totalCharges

    return NextResponse.json({
      success: true,
      charges: {
        amount: totalCharges,
        percentage: chargeConfig?.charge_percentage || null,
        name: chargeName
      },
      total_cost: totalCost,
      float_amount: amount
    })

  } catch (error) {
    console.error('Calculate Charges Error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

