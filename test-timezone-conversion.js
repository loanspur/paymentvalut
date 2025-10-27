// Test timezone conversion more thoroughly
console.log('Testing timezone conversion...');

const dbTime = '2025-10-27T16:17:29.495';

console.log('Original UTC time:', dbTime);
console.log('Parsed as Date:', new Date(dbTime));

// Test different timezone options
console.log('\nDifferent timezone conversions:');

// Method 1: Using Africa/Nairobi
const result1 = new Date(dbTime).toLocaleString('en-US', {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'Africa/Nairobi'
});
console.log('Africa/Nairobi:', result1);

// Method 2: Using UTC+3 offset
const result2 = new Date(dbTime).toLocaleString('en-US', {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'UTC+3'
});
console.log('UTC+3:', result2);

// Method 3: Manual conversion
const utcDate = new Date(dbTime);
const eatDate = new Date(utcDate.getTime() + (3 * 60 * 60 * 1000));
const result3 = eatDate.toLocaleString('en-US', {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit'
});
console.log('Manual +3 hours:', result3);

// Method 4: Check what the browser thinks
console.log('\nBrowser timezone info:');
console.log('Timezone offset:', new Date().getTimezoneOffset());
console.log('Current time:', new Date().toISOString());
console.log('Current local time:', new Date().toString());

// Test with a known UTC time
const testUtc = '2025-10-27T16:00:00.000Z';
console.log('\nTest with known UTC time:', testUtc);
console.log('Should be 7:00 PM EAT:', new Date(testUtc).toLocaleString('en-US', {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'Africa/Nairobi'
}));
