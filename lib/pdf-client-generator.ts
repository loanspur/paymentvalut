// Client-side PDF generation using jsPDF
// This provides a fallback PDF generation option

export const generateClientSidePDF = async (): Promise<void> => {
  try {
    // Dynamic import to avoid SSR issues
    const { jsPDF } = await import('jspdf')
    
    const doc = new jsPDF()
    
    // Set up the document
    doc.setFontSize(20)
    doc.text('M-Pesa Vault API Documentation', 20, 30)
    
    doc.setFontSize(12)
    doc.text('Generated on: ' + new Date().toLocaleDateString(), 20, 45)
    
    let yPosition = 60
    
    // Add content sections
    const sections = [
      {
        title: 'System Overview',
        content: `The M-Pesa Vault system provides a comprehensive API for M-Pesa B2C disbursements with real-time balance monitoring and multi-tenant support.

What This System Provides:
• M-Pesa B2C Disbursement - Send money to customers via Supabase Edge Functions
• Real-time Status Updates - Track transaction progress with webhooks
• Partner Management - Multi-tenant support with role-based access
• Balance Monitoring - Real-time balance tracking and alerts
• Transaction History - Complete audit trail with utility balance tracking
• User Management - Enhanced user system with permissions and shortcode access

Base URL: https://your-domain.com
Authentication: x-api-key: partner_api_key

Important Notes:
• Minimum Amount: 10 KES (Safaricom requirement)
• Architecture: Supabase Edge Functions with PostgreSQL database
• Callbacks: Real-time webhook callbacks from Safaricom
• Environment: Production-ready with live M-Pesa integration
• Balance Tracking: Real-time utility balance monitoring per transaction`
      },
      {
        title: 'Authentication',
        content: `API Key Authentication
All API requests require a valid API key in the header.

x-api-key: your_partner_api_key

Available Partners & API Keys:
• Kulman Group Limited - kulman - [API_KEY_HIDDEN]
• Finsef Limited - finsafe - [API_KEY_HIDDEN]
• ABC Limited - abc - [API_KEY_HIDDEN]

Security Requirements:
• IP Whitelisting: Your USSD server IPs must be whitelisted
• HTTPS Only: All API calls must use HTTPS
• API Key Protection: Never expose API keys in client-side code
• Rate Limiting: Respect API rate limits`
      },
      {
        title: 'Send Money (Disbursement)',
        content: `Endpoint: POST https://your-domain.com/api/disburse

Request Headers:
{
  "x-api-key": "[YOUR_API_KEY]",
  "Content-Type": "application/json"
}

Request Body:
{
  "amount": 100,
  "msisdn": "254700000000",
  "tenant_id": "kulman",
  "customer_id": "customer_456",
  "client_request_id": "req_789",
  "occasion": "Payment for services"
}

Success Response:
{
  "status": "accepted",
  "conversation_id": "AG_20250913_1234567890",
  "originator_conversation_id": "abc-123-def-456",
  "response_code": "0",
  "response_description": "Accept the service request successfully.",
  "transaction_id": "bb8ab64c-e1aa-4f4f-aae3-54d9c84b0c26",
  "partner_id": "partner_123",
  "utility_balance": 15000.00
}

Insufficient Balance Response:
{
  "status": "rejected",
  "error_code": "BALANCE_1001",
  "error_message": "Insufficient balance in utility account",
  "current_balance": 5.00,
  "requested_amount": 100.00,
  "shortfall": 95.00,
  "conversation_id": null,
  "transaction_id": null
}`
      },
      {
        title: 'Error Codes',
        content: `AUTH_1001 - API key required - Include x-api-key header
AUTH_1002 - Invalid API key - Check API key is correct
AUTH_1003 - IP address not whitelisted - Contact admin to whitelist your IP
B2C_1001 - Missing required fields - Check request body
B2C_1002 - Invalid amount (minimum 10 KES) - Use amount >= 10
BALANCE_1001 - Insufficient balance in utility account - Top up account or reduce amount
MPESA_1001 - Unable to lock subscriber - Customer phone is busy, retry later
MPESA_1002 - Request cancelled by user - Customer cancelled the transaction
VALIDATION_1001 - Invalid phone number format - Use format 254XXXXXXXXX
VALIDATION_1002 - Missing required fields - Check request body for all required fields`
      }
    ]
    
    // Add each section
    sections.forEach((section, index) => {
      // Check if we need a new page
      if (yPosition > 250) {
        doc.addPage()
        yPosition = 30
      }
      
      // Add section title
      doc.setFontSize(16)
      doc.text(section.title, 20, yPosition)
      yPosition += 15
      
      // Add section content
      doc.setFontSize(10)
      const lines = doc.splitTextToSize(section.content, 170)
      doc.text(lines, 20, yPosition)
      yPosition += (lines.length * 5) + 10
    })
    
    // Save the PDF
    doc.save('mpesa-vault-api-documentation.pdf')
    
  } catch (error) {
    console.error('Client-side PDF generation error:', error)
    throw error
  }
}

export const isClientSidePDFSupported = (): boolean => {
  return typeof window !== 'undefined'
}

