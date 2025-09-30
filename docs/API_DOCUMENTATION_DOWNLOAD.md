# API Documentation Download Feature

## Overview

The M-Pesa Vault API documentation now includes downloadable formats for easy offline access and sharing with development teams.

## Available Download Formats

### 1. Markdown (.md)
- **Format**: Plain text markdown
- **Content**: Complete API documentation with all sections
- **Use Case**: Version control, editing, and developer reference
- **File Size**: ~50KB
- **Includes**:
  - System overview
  - Authentication details
  - API endpoints with examples
  - Error codes and responses
  - Webhook callback documentation
  - Code examples (JavaScript, cURL, PHP)

### 2. PDF (.pdf)
- **Format**: Portable Document Format
- **Content**: Formatted documentation optimized for printing
- **Use Case**: Offline reference, printing, and formal documentation
- **File Size**: ~200KB
- **Features**:
  - Professional formatting
  - Page numbers and headers
  - Print-optimized layout
  - All sections included

## How to Download

### From the Web Interface
1. Navigate to `/api-docs`
2. Click the **"Download MD"** button for markdown format
3. Click the **"Download PDF"** button for PDF format
4. The file will automatically download to your default download folder

### Programmatic Access
```javascript
// Download markdown
fetch('/api-docs/download-pdf')
  .then(response => response.blob())
  .then(blob => {
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'mpesa-vault-api-documentation.md'
    link.click()
  })
```

## Technical Implementation

### Client-Side PDF Generation
- Uses **jsPDF** library for client-side PDF generation
- No server dependencies required
- Works in all modern browsers
- Fallback to markdown if PDF generation fails

### Server-Side Generation
- API endpoint: `/api-docs/download-pdf`
- Returns markdown content as downloadable file
- Can be extended to use Puppeteer for true PDF generation
- Includes proper headers for file download

### File Structure
```
lib/
├── pdf-generator.ts          # Markdown content generation
├── pdf-client-generator.ts   # Client-side PDF generation
app/
├── api-docs/
│   ├── page.tsx             # Main documentation page
│   └── download-pdf/
│       └── route.ts         # Download API endpoint
```

## Content Sections

The downloadable documentation includes:

1. **System Overview**
   - Architecture details
   - Key features
   - Base URL and authentication

2. **Authentication**
   - API key requirements
   - Partner configurations
   - Security requirements

3. **Send Money (Disbursement)**
   - Endpoint details
   - Request/response examples
   - Error handling scenarios

4. **Transaction Status**
   - Status checking endpoints
   - Response formats
   - Status values

5. **Webhook Callbacks**
   - Callback endpoints
   - Payload examples
   - Data extraction details

6. **Error Codes**
   - Complete error code reference
   - Solutions and troubleshooting

7. **Code Examples**
   - JavaScript/Node.js
   - cURL commands
   - PHP examples

## Customization

### Adding New Sections
1. Update `generateAPIDocumentationPDF()` in `lib/pdf-generator.ts`
2. Add new section to the `sections` array
3. Include markdown content with proper formatting

### Modifying PDF Layout
1. Edit `generateClientSidePDF()` in `lib/pdf-client-generator.ts`
2. Adjust font sizes, margins, and page breaks
3. Customize headers and footers

### Styling Changes
1. Modify the markdown content structure
2. Update CSS classes in the main documentation page
3. Adjust PDF generation parameters

## Browser Compatibility

### Markdown Download
- ✅ All modern browsers
- ✅ Mobile devices
- ✅ No dependencies

### PDF Download
- ✅ Chrome 60+
- ✅ Firefox 55+
- ✅ Safari 12+
- ✅ Edge 79+
- ⚠️ Requires JavaScript enabled

## Performance Considerations

### File Sizes
- **Markdown**: ~50KB (fast download)
- **PDF**: ~200KB (acceptable for documentation)

### Generation Time
- **Markdown**: Instant
- **PDF**: 1-3 seconds (client-side generation)

### Caching
- Files are generated on-demand
- No caching implemented (can be added if needed)
- Consider CDN for production use

## Security Considerations

### File Downloads
- No sensitive data in documentation
- Generic examples with placeholder values
- No API keys or credentials included

### Content Validation
- All content is statically generated
- No user input in documentation
- Sanitized examples and code snippets

## Future Enhancements

### Planned Features
1. **Multiple Languages**: Support for different language versions
2. **Custom Branding**: Partner-specific documentation
3. **Interactive PDFs**: Clickable links and bookmarks
4. **Version Control**: Track documentation changes
5. **API Integration**: Auto-generate from OpenAPI specs

### Technical Improvements
1. **Puppeteer Integration**: True server-side PDF generation
2. **Template System**: Configurable documentation templates
3. **Export Options**: Additional formats (HTML, Word, etc.)
4. **Batch Generation**: Generate multiple versions at once

## Troubleshooting

### Common Issues

#### PDF Download Fails
- **Cause**: JavaScript disabled or jsPDF not loaded
- **Solution**: Use markdown download as fallback
- **Check**: Browser console for errors

#### Large File Sizes
- **Cause**: Too much content or images
- **Solution**: Optimize content or split into multiple files
- **Check**: File size limits in browser

#### Formatting Issues
- **Cause**: Font or layout problems
- **Solution**: Check browser compatibility
- **Check**: PDF viewer settings

### Support
For issues with the download feature:
1. Check browser console for errors
2. Try different browser or incognito mode
3. Clear browser cache and cookies
4. Contact technical support

## Dependencies

### Required Packages
```json
{
  "jspdf": "^2.5.1"
}
```

### Installation
```bash
npm install jspdf
```

### Optional Dependencies
For advanced PDF generation:
```json
{
  "puppeteer": "^21.0.0"
}
```

## License

This documentation download feature is part of the M-Pesa Vault system and follows the same licensing terms.

