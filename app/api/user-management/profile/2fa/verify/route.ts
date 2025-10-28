import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { authenticator } from 'otplib'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const { verificationCode, secret } = await request.json()

    if (!verificationCode || !secret) {
      return NextResponse.json(
        { success: false, error: 'Verification code and secret are required' },
        { status: 400 }
      )
    }

    // Verify the code
    const isValid = authenticator.verify({
      token: verificationCode,
      secret: secret
    })

    if (!isValid) {
      return NextResponse.json(
        { success: false, error: 'Invalid verification code' },
        { status: 400 }
      )
    }

    // Get user from session
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json(
        { success: false, error: 'No authorization header' },
        { status: 401 }
      )
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Invalid token' },
        { status: 401 }
      )
    }

    // Update user's 2FA status in the database
    const { error: updateError } = await supabase
      .from('users')
      .update({
        two_factor_enabled: true,
        two_factor_secret: secret, // In production, encrypt this
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id)

    if (updateError) {
      console.error('Error updating user 2FA status:', updateError)
      return NextResponse.json(
        { success: false, error: 'Failed to enable 2FA' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Two-factor authentication enabled successfully'
    })

  } catch (error) {
    console.error('2FA Verification Error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to verify 2FA' },
      { status: 500 }
    )
  }
}
