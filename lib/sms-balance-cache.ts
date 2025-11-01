// In-memory cache for SMS balance to reduce API calls
// Balance is cached for 30 seconds for quick display

interface CachedBalance {
  balance: number
  expiresAt: number
}

let balanceCache: CachedBalance | null = null
const BALANCE_CACHE_TTL = 30 * 1000 // 30 seconds
const EXPIRED_CACHE_TTL = 2 * 60 * 1000 // 2 minutes - allow expired cache for fallback

export function getCachedBalance(): number | null {
  if (!balanceCache) return null
  
  // Return cached balance even if expired (for fallback)
  // Only return null if cache is very old (>2 minutes)
  const now = Date.now()
  if (now > balanceCache.expiresAt + EXPIRED_CACHE_TTL) {
    balanceCache = null
    return null
  }
  
  return balanceCache.balance
}

export function getCachedBalanceStrict(): number | null {
  // Strict check - only return if not expired
  if (!balanceCache) return null
  
  if (Date.now() > balanceCache.expiresAt) {
    return null
  }
  
  return balanceCache.balance
}

export function setCachedBalance(balance: number): void {
  balanceCache = {
    balance,
    expiresAt: Date.now() + BALANCE_CACHE_TTL
  }
}

export function clearBalanceCache(): void {
  balanceCache = null
}

