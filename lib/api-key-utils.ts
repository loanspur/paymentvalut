/**
 * Utility functions for generating secure API keys
 */

/**
 * Generates a strong, secure API key with a familiar prefix
 * @param partnerName - The name of the partner
 * @param environment - The environment (live, sandbox, test)
 * @returns A secure API key with format: {prefix}_sk_{env}_{timestamp}_{random}
 */
export function generateStrongAPIKey(partnerName: string, environment: string = 'live'): string {
  // Create a clean prefix from partner name (max 8 chars, alphanumeric only)
  const prefix = partnerName
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .substring(0, 8)
    .padEnd(8, 'x') // Pad with 'x' if too short

  // Generate timestamp in base36 for uniqueness
  const timestamp = Date.now().toString(36)

  // Generate cryptographically secure random bytes
  const randomBytes = crypto.getRandomValues(new Uint8Array(24))
  const randomString = Array.from(randomBytes, byte => 
    byte.toString(36).padStart(2, '0')
  ).join('')

  // Combine all parts and limit to 64 characters for security
  const apiKey = `${prefix}_sk_${environment}_${timestamp}_${randomString}`
  
  return apiKey.substring(0, 64)
}

/**
 * Validates if an API key has the correct format
 * @param apiKey - The API key to validate
 * @returns True if the API key format is valid
 */
export function validateAPIKeyFormat(apiKey: string): boolean {
  // Check if API key matches the expected format
  const apiKeyPattern = /^[a-z0-9]{8}_sk_(live|sandbox|test)_[a-z0-9]+_[a-z0-9]+$/
  return apiKeyPattern.test(apiKey) && apiKey.length >= 32 && apiKey.length <= 64
}

/**
 * Extracts partner information from API key
 * @param apiKey - The API key to parse
 * @returns Object with partner prefix and environment
 */
export function parseAPIKey(apiKey: string): { prefix: string; environment: string } | null {
  const match = apiKey.match(/^([a-z0-9]{8})_sk_(live|sandbox|test)_/)
  if (!match) return null
  
  return {
    prefix: match[1],
    environment: match[2]
  }
}

/**
 * Generates a hash for storing API keys securely
 * @param apiKey - The API key to hash
 * @returns Promise that resolves to the SHA-256 hash
 */
export async function hashAPIKey(apiKey: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(apiKey)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}
