/**
 * Script to query M-Pesa transaction status using Originator Conversation ID
 * 
 * Usage:
 *   node scripts/query-mpesa-transaction-status.js <originator_conversation_id>
 * 
 * Or with environment variables:
 *   MPESA_CONSUMER_KEY=xxx MPESA_CONSUMER_SECRET=xxx node scripts/query-mpesa-transaction-status.js <originator_conversation_id>
 */

const https = require('https');

// Configuration - Set these in environment variables or modify here
const CONFIG = {
  consumerKey: process.env.MPESA_CONSUMER_KEY || 'YOUR_CONSUMER_KEY',
  consumerSecret: process.env.MPESA_CONSUMER_SECRET || 'YOUR_CONSUMER_SECRET',
  environment: process.env.MPESA_ENVIRONMENT || 'production', // 'production' or 'sandbox'
  initiatorName: process.env.MPESA_INITIATOR_NAME || 'YOUR_INITIATOR_NAME',
  securityCredential: process.env.MPESA_SECURITY_CREDENTIAL || 'YOUR_SECURITY_CREDENTIAL',
  shortcode: process.env.MPESA_SHORTCODE || 'YOUR_SHORTCODE',
  resultURL: process.env.MPESA_RESULT_URL || 'https://your-domain.com/api/mpesa-callback/transaction-status-result',
  timeoutURL: process.env.MPESA_TIMEOUT_URL || 'https://your-domain.com/api/mpesa-callback/transaction-status-timeout'
};

// Get Originator Conversation ID from command line
const originatorConversationId = process.argv[2];

if (!originatorConversationId) {
  console.error('❌ Error: Originator Conversation ID is required');
  console.log('\nUsage:');
  console.log('  node scripts/query-mpesa-transaction-status.js <originator_conversation_id>');
  console.log('\nExample:');
  console.log('  node scripts/query-mpesa-transaction-status.js 012e-4077-9e75-d1e27265b99098043');
  process.exit(1);
}

// Validate configuration
if (CONFIG.consumerKey === 'YOUR_CONSUMER_KEY' || CONFIG.consumerSecret === 'YOUR_CONSUMER_SECRET') {
  console.error('❌ Error: M-Pesa credentials not configured');
  console.log('\nPlease set environment variables:');
  console.log('  MPESA_CONSUMER_KEY');
  console.log('  MPESA_CONSUMER_SECRET');
  console.log('  MPESA_SECURITY_CREDENTIAL');
  console.log('  MPESA_INITIATOR_NAME');
  console.log('  MPESA_SHORTCODE');
  console.log('  MPESA_ENVIRONMENT (optional, default: production)');
  process.exit(1);
}

// Base URLs
const baseUrl = CONFIG.environment === 'production' 
  ? 'https://api.safaricom.co.ke'
  : 'https://sandbox.safaricom.co.ke';

/**
 * Get M-Pesa OAuth access token
 */
async function getAccessToken() {
  return new Promise((resolve, reject) => {
    const auth = Buffer.from(`${CONFIG.consumerKey}:${CONFIG.consumerSecret}`).toString('base64');
    
    const options = {
      hostname: CONFIG.environment === 'production' ? 'api.safaricom.co.ke' : 'sandbox.safaricom.co.ke',
      path: '/oauth/v1/generate?grant_type=client_credentials',
      method: 'GET',
      headers: {
        'Authorization': `Basic ${auth}`
      }
    };

    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          if (response.access_token) {
            resolve(response.access_token);
          } else {
            reject(new Error(`Failed to get access token: ${JSON.stringify(response)}`));
          }
        } catch (error) {
          reject(new Error(`Failed to parse token response: ${error.message}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.end();
  });
}

/**
 * Query transaction status
 */
async function queryTransactionStatus(accessToken, originatorConversationId) {
  return new Promise((resolve, reject) => {
    const requestBody = JSON.stringify({
      Initiator: CONFIG.initiatorName,
      SecurityCredential: CONFIG.securityCredential,
      CommandID: 'TransactionStatusQuery',
      TransactionID: originatorConversationId, // Using Originator Conversation ID as Transaction ID
      PartyA: CONFIG.shortcode,
      IdentifierType: '4',
      ResultURL: CONFIG.resultURL,
      QueueTimeOutURL: CONFIG.timeoutURL,
      Remarks: 'Transaction Status Query',
      Occasion: `StatusQuery_${Date.now()}`
    });

    const hostname = CONFIG.environment === 'production' ? 'api.safaricom.co.ke' : 'sandbox.safaricom.co.ke';
    
    const options = {
      hostname: hostname,
      path: '/mpesa/transactionstatus/v1/query',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(requestBody)
      }
    };

    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          resolve(response);
        } catch (error) {
          reject(new Error(`Failed to parse response: ${error.message}. Response: ${data}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.write(requestBody);
    req.end();
  });
}

/**
 * Main function
 */
async function main() {
  try {
    console.log('🔐 Getting M-Pesa access token...');
    const accessToken = await getAccessToken();
    console.log('✅ Access token obtained');

    console.log(`\n📡 Querying transaction status for Originator Conversation ID: ${originatorConversationId}`);
    console.log(`🌍 Environment: ${CONFIG.environment}`);
    
    const response = await queryTransactionStatus(accessToken, originatorConversationId);
    
    console.log('\n✅ Transaction Status Query Initiated Successfully!');
    console.log('\n📋 Response:');
    console.log(JSON.stringify(response, null, 2));
    
    if (response.ResponseCode === '0') {
      console.log('\n✅ Query accepted by M-Pesa');
      console.log(`📞 Conversation ID: ${response.ConversationID}`);
      console.log(`📞 Originator Conversation ID: ${response.OriginatorConversationID}`);
      console.log(`\n⏳ The result will be sent to your callback URL: ${CONFIG.resultURL}`);
      console.log('   Check your callback endpoint for the transaction status.');
    } else {
      console.log(`\n❌ Query failed: ${response.ResponseDescription}`);
    }
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    if (error.stack) {
      console.error('\nStack trace:', error.stack);
    }
    process.exit(1);
  }
}

// Run the script
main();

