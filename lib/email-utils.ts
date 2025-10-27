// Email utility functions for sending emails using Resend.com
import { Resend } from 'resend'

interface EmailOptions {
  to: string
  subject: string
  html: string
  text?: string
}

const resend = new Resend(process.env.RESEND_API_KEY)

export async function sendEmail(options: EmailOptions): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    if (!process.env.RESEND_API_KEY) {
      console.error('❌ RESEND_API_KEY is not configured')
      return { success: false, error: 'Email service not configured' }
    }

    if (!process.env.RESEND_FROM_EMAIL) {
      console.error('❌ RESEND_FROM_EMAIL is not configured')
      return { success: false, error: 'From email not configured' }
    }

    const result = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
    })

    console.log('✅ Email sent successfully:', {
      to: options.to,
      subject: options.subject,
      messageId: result.data?.id
    })

    return { 
      success: true, 
      messageId: result.data?.id 
    }
  } catch (error: any) {
    console.error('❌ Email sending failed:', error)
    return { 
      success: false, 
      error: error.message || 'Unknown error occurred' 
    }
  }
}

export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

export function sanitizeEmail(email: string): string {
  return email.toLowerCase().trim()
}

