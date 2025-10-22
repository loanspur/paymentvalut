// Test to capture and analyze default Mifos X webhook payload
const https = require('https')
const fs = require('fs')

// Create a simple webhook receiver to capture the actual payload
const server = https.createServer({
  key: fs.readFileSync('server.key', 'utf8'), // You'll need to create these
  cert: fs.readFileSync('server.cert', 'utf8')
}, (req, res) => {
  if (req.method === 'POST' && req.url === '/webhook') {
    let body = ''
    
    req.on('data', chunk => {
      body += chunk.toString()
    })
    
    req.on('end', () => {
      console.log('📥 Received webhook from Mifos X:')
      console.log('Headers:', JSON.stringify(req.headers, null, 2))
      console.log('Body:', body)
      
      try {
        const payload = JSON.parse(body)
        console.log('📋 Parsed Payload:')
        console.log(JSON.stringify(payload, null, 2))
        
        // Save to file for analysis
        fs.writeFileSync('mifos-webhook-payload.json', JSON.stringify(payload, null, 2))
        console.log('💾 Payload saved to mifos-webhook-payload.json')
        
      } catch (error) {
        console.log('❌ Failed to parse JSON:', error.message)
        console.log('Raw body:', body)
      }
      
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ success: true, message: 'Webhook received' }))
    })
  } else {
    res.writeHead(404, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ error: 'Not found' }))
  }
})

// Alternative: Use ngrok or similar to expose local server
console.log('🔍 Mifos X Webhook Payload Capture Tool')
console.log('=====================================')
console.log('')
console.log('This tool will help you capture the actual webhook payload from Mifos X.')
console.log('')
console.log('Option 1: Use ngrok (Recommended)')
console.log('1. Install ngrok: https://ngrok.com/download')
console.log('2. Run: ngrok http 3001')
console.log('3. Use the ngrok URL in your Mifos X webhook configuration')
console.log('4. Approve a loan in Mifos X to trigger the webhook')
console.log('')
console.log('Option 2: Use a webhook testing service')
console.log('1. Go to https://webhook.site/')
console.log('2. Copy the unique URL provided')
console.log('3. Use that URL in your Mifos X webhook configuration')
console.log('4. Approve a loan in Mifos X')
console.log('5. Check the webhook.site page for the received payload')
console.log('')
console.log('Option 3: Use RequestBin')
console.log('1. Go to https://requestbin.com/')
console.log('2. Create a new bin')
console.log('3. Use the bin URL in your Mifos X webhook configuration')
console.log('4. Approve a loan in Mifos X')
console.log('5. Check the bin page for the received payload')
console.log('')

// Start server
const PORT = 3001
server.listen(PORT, () => {
  console.log(`🚀 Webhook receiver running on https://localhost:${PORT}/webhook`)
  console.log('')
  console.log('To test locally:')
  console.log(`curl -X POST https://localhost:${PORT}/webhook \\`)
  console.log('  -H "Content-Type: application/json" \\')
  console.log('  -d \'{"test": "payload"}\'')
  console.log('')
  console.log('Press Ctrl+C to stop the server')
})

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n👋 Shutting down webhook receiver...')
  server.close(() => {
    console.log('✅ Server closed')
    process.exit(0)
  })
})

