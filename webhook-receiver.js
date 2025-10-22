// Simple webhook receiver to capture Mifos X payload
const http = require('http')
const fs = require('fs')

const server = http.createServer((req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  
  if (req.method === 'OPTIONS') {
    res.writeHead(200)
    res.end()
    return
  }
  
  if (req.method === 'POST' && req.url === '/webhook') {
    let body = ''
    
    req.on('data', chunk => {
      body += chunk.toString()
    })
    
    req.on('end', () => {
      const timestamp = new Date().toISOString()
      
      console.log('📥 Received webhook at:', timestamp)
      console.log('Headers:', JSON.stringify(req.headers, null, 2))
      console.log('Body:', body)
      console.log('=' * 80)
      
      try {
        const payload = JSON.parse(body)
        console.log('📋 Parsed Payload:')
        console.log(JSON.stringify(payload, null, 2))
        
        // Save to file for analysis
        const filename = `mifos-webhook-${Date.now()}.json`
        const dataToSave = {
          timestamp,
          headers: req.headers,
          payload: payload
        }
        
        fs.writeFileSync(filename, JSON.stringify(dataToSave, null, 2))
        console.log(`💾 Payload saved to ${filename}`)
        
      } catch (error) {
        console.log('❌ Failed to parse JSON:', error.message)
        console.log('Raw body:', body)
        
        // Save raw data
        const filename = `mifos-webhook-raw-${Date.now()}.txt`
        fs.writeFileSync(filename, `Headers: ${JSON.stringify(req.headers, null, 2)}\n\nBody: ${body}`)
        console.log(`💾 Raw data saved to ${filename}`)
      }
      
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ 
        success: true, 
        message: 'Webhook received',
        timestamp 
      }))
    })
  } else if (req.method === 'GET' && req.url === '/') {
    res.writeHead(200, { 'Content-Type': 'text/html' })
    res.end(`
      <html>
        <head><title>Webhook Receiver</title></head>
        <body>
          <h1>🔍 Mifos X Webhook Receiver</h1>
          <p>This server is ready to receive webhooks from Mifos X.</p>
          <p>Webhook endpoint: <code>http://localhost:3001/webhook</code></p>
          <p>Use ngrok to expose this server: <code>ngrok http 3001</code></p>
          <p>Then use the ngrok URL in your Mifos X webhook configuration.</p>
        </body>
      </html>
    `)
  } else {
    res.writeHead(404, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ error: 'Not found' }))
  }
})

const PORT = 3001
server.listen(PORT, () => {
  console.log('🚀 Webhook receiver running on http://localhost:' + PORT)
  console.log('📡 Webhook endpoint: http://localhost:' + PORT + '/webhook')
  console.log('')
  console.log('📋 To expose this server to the internet:')
  console.log('1. Install ngrok: https://ngrok.com/download')
  console.log('2. Run: ngrok http 3001')
  console.log('3. Use the ngrok URL in your Mifos X webhook configuration')
  console.log('4. Approve a loan in Mifos X to trigger the webhook')
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

