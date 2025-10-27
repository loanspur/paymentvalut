import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params

    const { data: chargeConfig, error } = await supabase
      .from('partner_charges_config')
      .select(`
        *,
        partners!inner (
          id,
          name,
          is_active
        )
      `)
      .eq('id', id)
      .single()

    if (error) {
      console.error('Error fetching charge configuration:', error)
      return NextResponse.json(
        { success: false, error: 'Charge configuration not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        ...chargeConfig,
        partner_name: chargeConfig.partners?.name,
        partner_active: chargeConfig.partners?.is_active
      }
    })

  } catch (error) {
    console.error('Partner Charge GET Error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    const updateData = await request.json()

    // Remove fields that shouldn't be updated
    const { id: _, partner_id, created_at, ...allowedUpdates } = updateData

    const { data: chargeConfig, error } = await supabase
      .from('partner_charges_config')
      .update(allowedUpdates)
      .eq('id', id)
      .select(`
        *,
        partners!inner (
          id,
          name
        )
      `)
      .single()

    if (error) {
      console.error('Error updating charge configuration:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to update charge configuration' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Charge configuration updated successfully',
      data: {
        ...chargeConfig,
        partner_name: chargeConfig.partners?.name
      }
    })

  } catch (error) {
    console.error('Partner Charge PUT Error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params

    // Check if there are any transactions for this charge config
    const { data: transactions, error: transactionsError } = await supabase
      .from('partner_charge_transactions')
      .select('id')
      .eq('charge_config_id', id)
      .limit(1)

    if (transactionsError) {
      console.error('Error checking transactions:', transactionsError)
      return NextResponse.json(
        { success: false, error: 'Failed to check related transactions' },
        { status: 500 }
      )
    }

    if (transactions && transactions.length > 0) {
      return NextResponse.json(
        { success: false, error: 'Cannot delete charge configuration with existing transactions. Deactivate it instead.' },
        { status: 400 }
      )
    }

    const { error } = await supabase
      .from('partner_charges_config')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting charge configuration:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to delete charge configuration' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Charge configuration deleted successfully'
    })

  } catch (error) {
    console.error('Partner Charge DELETE Error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}







