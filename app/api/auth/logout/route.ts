import { NextRequest, NextResponse } from 'next/server'
import { AuthService } from '../../../../lib/auth'

export async function POST(request: NextRequest) {
  try {
    const sessionToken = request.headers.get('authorization')?.replace('Bearer ', '')

    if (!sessionToken) {
      return NextResponse.json(
        { error: 'Session token required' },
        { status: 400 }
      )
    }

    const success = await AuthService.logout(sessionToken)

    if (!success) {
      return NextResponse.json(
        { error: 'Logout failed' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Logged out successfully'
    })

  } catch (error) {
    return NextResponse.json(
      { error: 'Logout failed' },
      { status: 500 }
    )
  }
}
