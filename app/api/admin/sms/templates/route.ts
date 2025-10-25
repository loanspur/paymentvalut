import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyJWTToken } from '../../../../../lib/jwt-utils'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET - Fetch SMS templates for a partner or all partners
export async function GET(request: NextRequest) {
  try {
    // Authentication check
    const token = request.cookies.get('auth_token')?.value
    
    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Verify the JWT token
    const payload = await verifyJWTToken(token)
    
    if (!payload || !payload.userId) {
      return NextResponse.json(
        { success: false, error: 'Invalid authentication' },
        { status: 401 }
      )
    }

    // Check if user is admin
    if (payload.role !== 'super_admin' && payload.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Admin privileges required' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const partnerId = searchParams.get('partner_id')
    const templateType = searchParams.get('template_type')

    // Try to query SMS templates directly - if table doesn't exist, it will error

    // Build query
    let query = supabase
      .from('sms_templates')
      .select(`
        *,
        partners (
          id,
          name,
          short_code
        )
      `)
      .order('created_at', { ascending: false })

    // Apply filters
    if (partnerId) {
      query = query.eq('partner_id', partnerId)
    }
    if (templateType) {
      query = query.eq('template_type', templateType)
    }

    const { data: templates, error } = await query

    if (error) {
      console.error('Error fetching SMS templates:', error)
      
      // Check if it's a table doesn't exist error
      if (error.message && error.message.includes('relation "sms_templates" does not exist')) {
        return NextResponse.json({
          success: true,
          data: [],
          message: 'SMS tables not initialized. Please run the database migration.'
        })
      }
      
      return NextResponse.json(
        { success: false, error: 'Failed to fetch SMS templates' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: templates || []
    })

  } catch (error) {
    console.error('SMS Templates GET Error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST - Create or update SMS template
export async function POST(request: NextRequest) {
  try {
    // Authentication check
    const token = request.cookies.get('auth_token')?.value
    
    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Verify the JWT token
    const payload = await verifyJWTToken(token)
    
    if (!payload || !payload.userId) {
      return NextResponse.json(
        { success: false, error: 'Invalid authentication' },
        { status: 401 }
      )
    }

    // Check if user is admin
    if (payload.role !== 'super_admin' && payload.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Admin privileges required' },
        { status: 403 }
      )
    }

    const {
      id, // For updates
      partner_id,
      template_name,
      template_type,
      template_content,
      variables,
      is_active,
      is_default
    } = await request.json()

    // Validate required fields
    if (!partner_id || !template_name || !template_type || !template_content) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Validate template type
    const validTemplateTypes = [
      'balance_alert',
      'disbursement_confirmation', 
      'payment_receipt',
      'topup_confirmation',
      'loan_approval',
      'loan_disbursement',
      'custom'
    ]

    if (!validTemplateTypes.includes(template_type)) {
      return NextResponse.json(
        { success: false, error: 'Invalid template type' },
        { status: 400 }
      )
    }

    // Verify partner exists
    const { data: partner, error: partnerError } = await supabase
      .from('partners')
      .select('id, name')
      .eq('id', partner_id)
      .maybeSingle()

    if (partnerError) {
      console.error('Error verifying partner:', partnerError)
      return NextResponse.json(
        { success: false, error: 'Failed to verify partner' },
        { status: 500 }
      )
    }

    if (!partner) {
      return NextResponse.json(
        { success: false, error: 'Partner not found' },
        { status: 404 }
      )
    }

    // Extract variables from template content
    const extractedVariables = template_content.match(/\{([^}]+)\}/g)?.map(v => v.slice(1, -1)) || []
    const finalVariables = variables || extractedVariables

    let result
    if (id) {
      // Update existing template
      const { data, error } = await supabase
        .from('sms_templates')
        .update({
          template_name,
          template_type,
          template_content,
          variables: finalVariables,
          is_active: is_active ?? true,
          is_default: is_default ?? false,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .maybeSingle()

      result = data
      if (error) {
        console.error('Error updating SMS template:', error)
        return NextResponse.json(
          { success: false, error: 'Failed to update SMS template' },
          { status: 500 }
        )
      }
    } else {
      // Create new template
      const { data, error } = await supabase
        .from('sms_templates')
        .insert({
          partner_id,
          template_name,
          template_type,
          template_content,
          variables: finalVariables,
          is_active: is_active ?? true,
          is_default: is_default ?? false,
          created_by: payload.userId
        })
        .select()
        .maybeSingle()

      result = data
      if (error) {
        console.error('Error creating SMS template:', error)
        return NextResponse.json(
          { success: false, error: 'Failed to create SMS template' },
          { status: 500 }
        )
      }
    }

    return NextResponse.json({
      success: true,
      message: id ? 'SMS template updated successfully' : 'SMS template created successfully',
      data: result
    })

  } catch (error) {
    console.error('SMS Templates POST Error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE - Delete SMS template
export async function DELETE(request: NextRequest) {
  try {
    // Authentication check
    const token = request.cookies.get('auth_token')?.value
    
    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Verify the JWT token
    const payload = await verifyJWTToken(token)
    
    if (!payload || !payload.userId) {
      return NextResponse.json(
        { success: false, error: 'Invalid authentication' },
        { status: 401 }
      )
    }

    // Check if user is admin
    if (payload.role !== 'super_admin' && payload.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Admin privileges required' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const templateId = searchParams.get('template_id')

    if (!templateId) {
      return NextResponse.json(
        { success: false, error: 'Template ID is required' },
        { status: 400 }
      )
    }

    // Check if template is default
    const { data: template, error: templateError } = await supabase
      .from('sms_templates')
      .select('is_default')
      .eq('id', templateId)
      .maybeSingle()

    if (templateError) {
      console.error('Error checking template:', templateError)
      return NextResponse.json(
        { success: false, error: 'Failed to check template' },
        { status: 500 }
      )
    }

    if (!template) {
      return NextResponse.json(
        { success: false, error: 'Template not found' },
        { status: 404 }
      )
    }

    if (template.is_default) {
      return NextResponse.json(
        { success: false, error: 'Cannot delete default template' },
        { status: 400 }
      )
    }

    // Delete template
    const { error } = await supabase
      .from('sms_templates')
      .delete()
      .eq('id', templateId)

    if (error) {
      console.error('Error deleting SMS template:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to delete SMS template' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'SMS template deleted successfully'
    })

  } catch (error) {
    console.error('SMS Templates DELETE Error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
