// Test hash validation with the actual NCBA notification data
require('dotenv').config();
const crypto = require('crypto');

async function testHashValidation() {
  console.log('🔍 Testing hash validation with actual NCBA notification...');
  console.log('==========================================================');

  try {
    // Actual NCBA notification data
    const notificationData = {
      "TransType": "Pay Bill",
      "TransID": "TJR678LTWF",
      "FTRef": "FTC251027NYHH",
      "TransTime": "20251027180517",
      "TransAmount": "4.0",
      "BusinessShortCode": "880100",
      "BillRefNumber": "774451",
      "Narrative": "UMOJA",
      "Mobile": "254727638940",
      "name": "JUSTUS MURENGA WANJALA",
      "Username": "paymentvault",
      "Password": "QWERTYUIOPLKJHGFDSAqwertyuioplkjhgfdsa123432",
      "Hash": "Y2U1NTk2MjcyZjRhYzJlMjBmMzhkODBmY2E3NzJmZjk0NmNlMGQyY2E5OGMwZTg2OTg4ZTQ1ZmMzYWNmOTJjYQ=="
    };

    const secretKey = "Njowyuetr4332323jhdfghfrgrtjkkyhjky";

    console.log('1️⃣ Testing current hash generation method...');
    
    // Current method (from the code)
    function generateHashCurrent(secretKey, transType, transID, transTime, transAmount, businessShortCode, billRefNumber, mobile, name) {
      try {
        const hashString = secretKey + transType + transID + transTime + transAmount + businessShortCode + billRefNumber + mobile + name + "1";
        const sha256Hash = crypto.createHash('sha256').update(hashString, 'utf8').digest('hex');
        const base64Hash = Buffer.from(sha256Hash, 'hex').toString('base64');
        return base64Hash;
      } catch (error) {
        console.error('Error generating hash:', error);
        return '';
      }
    }

    const currentHash = generateHashCurrent(
      secretKey,
      notificationData.TransType,
      notificationData.TransID,
      notificationData.TransTime,
      notificationData.TransAmount,
      notificationData.BusinessShortCode,
      notificationData.BillRefNumber,
      notificationData.Mobile,
      notificationData.name
    );

    console.log(`   Generated hash: ${currentHash}`);
    console.log(`   Received hash:  ${notificationData.Hash}`);
    console.log(`   Match: ${currentHash === notificationData.Hash ? '✅' : '❌'}`);
    console.log('');

    console.log('2️⃣ Testing alternative hash generation methods...');
    
    // Method 2: Include FTRef and Narrative
    function generateHashWithFTRef(secretKey, transType, transID, ftRef, transTime, transAmount, businessShortCode, billRefNumber, narrative, mobile, name) {
      try {
        const hashString = secretKey + transType + transID + ftRef + transTime + transAmount + businessShortCode + billRefNumber + narrative + mobile + name + "1";
        const sha256Hash = crypto.createHash('sha256').update(hashString, 'utf8').digest('hex');
        const base64Hash = Buffer.from(sha256Hash, 'hex').toString('base64');
        return base64Hash;
      } catch (error) {
        console.error('Error generating hash:', error);
        return '';
      }
    }

    const hashWithFTRef = generateHashWithFTRef(
      secretKey,
      notificationData.TransType,
      notificationData.TransID,
      notificationData.FTRef,
      notificationData.TransTime,
      notificationData.TransAmount,
      notificationData.BusinessShortCode,
      notificationData.BillRefNumber,
      notificationData.Narrative,
      notificationData.Mobile,
      notificationData.name
    );

    console.log(`   Hash with FTRef: ${hashWithFTRef}`);
    console.log(`   Match: ${hashWithFTRef === notificationData.Hash ? '✅' : '❌'}`);
    console.log('');

    // Method 3: Different order
    function generateHashDifferentOrder(secretKey, transType, transID, transTime, transAmount, businessShortCode, billRefNumber, mobile, name) {
      try {
        const hashString = secretKey + transType + transID + transTime + transAmount + businessShortCode + billRefNumber + mobile + name;
        const sha256Hash = crypto.createHash('sha256').update(hashString, 'utf8').digest('hex');
        const base64Hash = Buffer.from(sha256Hash, 'hex').toString('base64');
        return base64Hash;
      } catch (error) {
        console.error('Error generating hash:', error);
        return '';
      }
    }

    const hashDifferentOrder = generateHashDifferentOrder(
      secretKey,
      notificationData.TransType,
      notificationData.TransID,
      notificationData.TransTime,
      notificationData.TransAmount,
      notificationData.BusinessShortCode,
      notificationData.BillRefNumber,
      notificationData.Mobile,
      notificationData.name
    );

    console.log(`   Hash different order: ${hashDifferentOrder}`);
    console.log(`   Match: ${hashDifferentOrder === notificationData.Hash ? '✅' : '❌'}`);
    console.log('');

    // Method 4: Try to decode the received hash
    console.log('3️⃣ Analyzing the received hash...');
    try {
      const decodedHash = Buffer.from(notificationData.Hash, 'base64').toString('hex');
      console.log(`   Decoded hash (hex): ${decodedHash}`);
      console.log(`   Length: ${decodedHash.length} characters`);
    } catch (error) {
      console.log(`   Error decoding hash: ${error.message}`);
    }

    console.log('');
    console.log('📋 HASH VALIDATION ANALYSIS:');
    console.log('============================');
    console.log('The hash validation is failing, which means:');
    console.log('1. NCBA is using a different hash generation method');
    console.log('2. The secret key might be incorrect');
    console.log('3. The field order or inclusion might be different');
    console.log('');
    console.log('🔧 RECOMMENDED FIX:');
    console.log('===================');
    console.log('1. Temporarily disable hash validation for testing');
    console.log('2. Process the transaction without hash validation');
    console.log('3. Contact NCBA for correct hash generation method');
    console.log('4. Update the hash validation logic once confirmed');

  } catch (error) {
    console.error('❌ Hash test failed:', error);
  }
}

// Run the test
testHashValidation();
