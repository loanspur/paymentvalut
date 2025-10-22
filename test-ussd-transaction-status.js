#!/usr/bin/env node

/**
 * Test script for USSD Transaction Status API
 * 
 * Usage:
 * node test-ussd-transaction-status.js [API_KEY] [BASE_URL]
 * 
 * Example:
 * node test-ussd-transaction-status.js your-api-key https://your-domain.com
 */

const https = require('https');
const http = require('http');

// Configuration
const API_KEY = process.argv[2] || 'test-api-key';
const BASE_URL = process.argv[3] || 'http://localhost:3000';
const ENDPOINT = '/api/ussd/transaction-status';

// Helper function to make HTTP requests
function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const isHttps = url.startsWith('https://');
    const client = isHttps ? https : http;
    
    const requestOptions = {
      headers: {
        'x-api-key': API_KEY,
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    };

    const req = client.request(url, requestOptions, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: jsonData
          });
        } catch (error) {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: data
          });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    if (options.body) {
      req.write(options.body);
    }

    req.end();
  });
}

// Test functions
async function testGetEndpoint() {
  console.log('\n🔍 Testing GET endpoint...');
  
  try {
    const url = `${BASE_URL}${ENDPOINT}?limit=5`;
    const response = await makeRequest(url);
    
    console.log(`Status: ${response.status}`);
    console.log('Response:', JSON.stringify(response.data, null, 2));
    
    if (response.status === 200 && response.data.success) {
      console.log('✅ GET endpoint test passed');
    } else {
      console.log('❌ GET endpoint test failed');
    }
  } catch (error) {
    console.log('❌ GET endpoint test error:', error.message);
  }
}

async function testGetWithFilters() {
  console.log('\n🔍 Testing GET endpoint with filters...');
  
  try {
    const url = `${BASE_URL}${ENDPOINT}?status=success&limit=3`;
    const response = await makeRequest(url);
    
    console.log(`Status: ${response.status}`);
    console.log('Response:', JSON.stringify(response.data, null, 2));
    
    if (response.status === 200 && response.data.success) {
      console.log('✅ GET with filters test passed');
    } else {
      console.log('❌ GET with filters test failed');
    }
  } catch (error) {
    console.log('❌ GET with filters test error:', error.message);
  }
}

async function testPostEndpoint() {
  console.log('\n🔍 Testing POST endpoint...');
  
  try {
    const url = `${BASE_URL}${ENDPOINT}`;
    const body = JSON.stringify({
      conversation_ids: ['AG_20250110_1234567890'],
      client_request_ids: ['TEST-2025-01-10-000123']
    });
    
    const response = await makeRequest(url, {
      method: 'POST',
      body: body
    });
    
    console.log(`Status: ${response.status}`);
    console.log('Response:', JSON.stringify(response.data, null, 2));
    
    if (response.status === 200 && response.data.success) {
      console.log('✅ POST endpoint test passed');
    } else {
      console.log('❌ POST endpoint test failed');
    }
  } catch (error) {
    console.log('❌ POST endpoint test error:', error.message);
  }
}

async function testInvalidApiKey() {
  console.log('\n🔍 Testing invalid API key...');
  
  try {
    const url = `${BASE_URL}${ENDPOINT}?limit=1`;
    const response = await makeRequest(url, {
      headers: {
        'x-api-key': 'invalid-api-key',
        'Content-Type': 'application/json'
      }
    });
    
    console.log(`Status: ${response.status}`);
    console.log('Response:', JSON.stringify(response.data, null, 2));
    
    if (response.status === 401 && !response.data.success) {
      console.log('✅ Invalid API key test passed');
    } else {
      console.log('❌ Invalid API key test failed');
    }
  } catch (error) {
    console.log('❌ Invalid API key test error:', error.message);
  }
}

async function testMissingApiKey() {
  console.log('\n🔍 Testing missing API key...');
  
  try {
    const url = `${BASE_URL}${ENDPOINT}?limit=1`;
    const response = await makeRequest(url, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log(`Status: ${response.status}`);
    console.log('Response:', JSON.stringify(response.data, null, 2));
    
    if (response.status === 401 && !response.data.success) {
      console.log('✅ Missing API key test passed');
    } else {
      console.log('❌ Missing API key test failed');
    }
  } catch (error) {
    console.log('❌ Missing API key test error:', error.message);
  }
}

async function testInvalidPostData() {
  console.log('\n🔍 Testing invalid POST data...');
  
  try {
    const url = `${BASE_URL}${ENDPOINT}`;
    const body = JSON.stringify({});
    
    const response = await makeRequest(url, {
      method: 'POST',
      body: body
    });
    
    console.log(`Status: ${response.status}`);
    console.log('Response:', JSON.stringify(response.data, null, 2));
    
    if (response.status === 400 && !response.data.success) {
      console.log('✅ Invalid POST data test passed');
    } else {
      console.log('❌ Invalid POST data test failed');
    }
  } catch (error) {
    console.log('❌ Invalid POST data test error:', error.message);
  }
}

// Main test runner
async function runTests() {
  console.log('🚀 Starting USSD Transaction Status API Tests');
  console.log(`Base URL: ${BASE_URL}`);
  console.log(`API Key: ${API_KEY.substring(0, 8)}...`);
  console.log(`Endpoint: ${ENDPOINT}`);
  
  await testGetEndpoint();
  await testGetWithFilters();
  await testPostEndpoint();
  await testInvalidApiKey();
  await testMissingApiKey();
  await testInvalidPostData();
  
  console.log('\n🏁 All tests completed!');
  console.log('\n📋 Test Summary:');
  console.log('- GET endpoint with basic query');
  console.log('- GET endpoint with filters');
  console.log('- POST endpoint with bulk data');
  console.log('- Authentication validation');
  console.log('- Error handling');
  
  console.log('\n📖 For more information, see: USSD_TRANSACTION_STATUS_API.md');
}

// Run tests if this script is executed directly
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = {
  makeRequest,
  testGetEndpoint,
  testGetWithFilters,
  testPostEndpoint,
  testInvalidApiKey,
  testMissingApiKey,
  testInvalidPostData,
  runTests
};
