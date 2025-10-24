// Debug script to track login redirects
// Run this in browser console to see what's happening

console.log('🔍 Starting login redirect debug...')

// Track all navigation events
let redirectCount = 0
const maxRedirects = 10

function trackRedirect() {
  redirectCount++
  console.log(`🔄 Redirect #${redirectCount}: ${window.location.href}`)
  
  if (redirectCount > maxRedirects) {
    console.error('❌ Too many redirects detected! Stopping to prevent infinite loop.')
    return
  }
}

// Track page changes
let currentUrl = window.location.href
console.log(`📍 Initial URL: ${currentUrl}`)

// Monitor URL changes
setInterval(() => {
  if (window.location.href !== currentUrl) {
    console.log(`🔄 URL changed from ${currentUrl} to ${window.location.href}`)
    currentUrl = window.location.href
    trackRedirect()
  }
}, 100)

// Track fetch requests to auth endpoints
const originalFetch = window.fetch
window.fetch = function(...args) {
  const url = args[0]
  if (typeof url === 'string' && url.includes('/api/auth/')) {
    console.log(`📡 Auth API call: ${url}`)
  }
  return originalFetch.apply(this, args)
}

// Track router navigation
if (window.next && window.next.router) {
  const originalPush = window.next.router.push
  const originalReplace = window.next.router.replace
  
  window.next.router.push = function(...args) {
    console.log(`🧭 Router.push: ${args[0]}`)
    return originalPush.apply(this, args)
  }
  
  window.next.router.replace = function(...args) {
    console.log(`🧭 Router.replace: ${args[0]}`)
    return originalReplace.apply(this, args)
  }
}

console.log('✅ Debug tracking started. Navigate to login pages to see redirects.')
