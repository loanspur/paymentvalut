// Test timestamp creation
console.log('Testing timestamp creation...');

// Method 1: Direct toISOString()
const timestamp1 = new Date().toISOString();
console.log('Method 1 (new Date().toISOString()):', timestamp1);

// Method 2: Using Date.now()
const timestamp2 = new Date(Date.now()).toISOString();
console.log('Method 2 (new Date(Date.now()).toISOString()):', timestamp2);

// Method 3: Using UTC methods
const now = new Date();
const timestamp3 = new Date(now.getTime()).toISOString();
console.log('Method 3 (new Date(now.getTime()).toISOString()):', timestamp3);

// Method 4: Manual UTC construction
const utcNow = new Date();
const timestamp4 = utcNow.toISOString();
console.log('Method 4 (utcNow.toISOString()):', timestamp4);

// Check if all methods produce the same result
console.log('\nAll timestamps are identical:', 
  timestamp1 === timestamp2 && 
  timestamp2 === timestamp3 && 
  timestamp3 === timestamp4
);

// Check the actual timezone offset
console.log('\nTimezone offset (minutes):', new Date().getTimezoneOffset());
console.log('Timezone offset (hours):', new Date().getTimezoneOffset() / 60);

// Test with a specific date
const testDate = new Date('2025-10-27T16:09:59.848Z');
console.log('\nTest date (UTC):', testDate.toISOString());
console.log('Test date (local):', testDate.toString());
console.log('Test date (UTC string):', testDate.toUTCString());
