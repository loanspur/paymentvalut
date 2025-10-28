import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { authenticator } from 'otplib'
import QRCode from 'qrcode'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
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

    // Generate a new secret
    const secret = authenticator.generateSecret()
    
    // Create the service name and account name
    const serviceName = 'M-Pesa Vault'
    const accountName = user.email || 'user'
    
    // Generate the OTP URL
    const otpUrl = authenticator.keyuri(accountName, serviceName, secret)
    
    // Generate QR code
    const qrCode = await QRCode.toDataURL(otpUrl)
    
    // Generate backup codes
    const backupCodes = Array.from({ length: 10 }, () => 
      Math.random().toString(36).substring(2, 8).toUpperCase()
    )

    // Store the secret temporarily (you might want to store this in a secure way)
    // For now, we'll return it to the client to verify
    return NextResponse.json({
      success: true,
      secret,
      qrCode,
      backupCodes,
      message: '2FA setup initiated. Please scan the QR code with your authenticator app.'
    })

  } catch (error) {
    console.error('2FA Setup Error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to setup 2FA' },
      { status: 500 }
    )
  }
}
