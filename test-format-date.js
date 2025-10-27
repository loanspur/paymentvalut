// Test the formatDate function with actual data
const formatDate = (dateString) => {
  if (!dateString) return 'Invalid Date'
  
  // Handle NCBA timestamp format (YYYYMMDDhhmmss)
  if (dateString.length === 14 && /^\d{14}$/.test(dateString)) {
    const year = dateString.substring(0, 4)
    const month = dateString.substring(4, 6)
    const day = dateString.substring(6, 8)
    const hour = dateString.substring(8, 10)
    const minute = dateString.substring(10, 12)
    const second = dateString.substring(12, 14)
    
    const isoString = `${year}-${month}-${day}T${hour}:${minute}:${second}`
    return new Date(isoString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Africa/Nairobi'
    })
  }
  
  // Handle regular ISO date strings
  return new Date(dateString).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Africa/Nairobi'
  })
}

// Test with actual data
console.log('Testing formatDate function...');

// Test with NCBA transaction time
const ncbaTime = '20251027190952';
console.log('NCBA Time:', ncbaTime);
console.log('Formatted:', formatDate(ncbaTime));

// Test with database created_at
const dbTime = '2025-10-27T16:17:29.495';
console.log('\nDB Time:', dbTime);
console.log('Formatted:', formatDate(dbTime));

// Test with wallet transaction time
const walletTime = '2025-10-27T16:17:30.288463';
console.log('\nWallet Time:', walletTime);
console.log('Formatted:', formatDate(walletTime));

// Test what the correct conversion should be
console.log('\nExpected conversions:');
console.log('DB Time (16:17 UTC) should show as:', new Date(dbTime).toLocaleString('en-US', {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'Africa/Nairobi'
}));
