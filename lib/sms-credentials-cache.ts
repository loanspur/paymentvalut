// Simple in-memory cache for SMS credentials to avoid repeated database queries
// Credentials are cached for 5 minutes to reduce database load

interface CachedCredentials {
  username: string
  apiKey: string
  isEncrypted: boolean
  expiresAt: number
}

let credentialsCache: Map<string, CachedCredentials> = new Map()
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

export function getCachedCredentials(key: string): CachedCredentials | null {
  const cached = credentialsCache.get(key)
  if (!cached) return null
  
  if (Date.now() > cached.expiresAt) {
    credentialsCache.delete(key)
    return null
  }
  
  return cached
}

export function setCachedCredentials(key: string, username: string, apiKey: string, isEncrypted: boolean): void {
  credentialsCache.set(key, {
    username,
    apiKey,
    isEncrypted,
    expiresAt: Date.now() + CACHE_TTL
  })
}

export function clearCredentialsCache(key?: string): void {
  if (key) {
    credentialsCache.delete(key)
  } else {
    credentialsCache.clear()
  }
}

