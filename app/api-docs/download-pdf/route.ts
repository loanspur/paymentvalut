import { NextRequest, NextResponse } from 'next/server'
import { generateAPIDocumentationPDF } from '../../../lib/pdf-generator'

export async function GET(request: NextRequest) {
  try {
    // Generate markdown content
    const markdownContent = generateAPIDocumentationPDF()
    
    // For now, return the markdown content as a downloadable file
    // In production, you could use a service like:
    // - Puppeteer (requires server setup)
    // - jsPDF (client-side PDF generation)
    // - External PDF generation service
    
    return new NextResponse(markdownContent, {
      headers: {
        'Content-Type': 'text/markdown',
        'Content-Disposition': 'attachment; filename="mpesa-vault-api-documentation.md"',
        'Content-Length': markdownContent.length.toString()
      }
    })
    
  } catch (error) {
    console.error('Documentation generation error:', error)
    return NextResponse.json(
      { error: 'Failed to generate documentation', message: error.message },
      { status: 500 }
    )
  }
}
