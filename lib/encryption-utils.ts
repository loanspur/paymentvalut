import crypto from 'crypto'

const ALGORITHM = 'aes-256-cbc'
const IV_LENGTH = 16 // For AES, this is always 16

/**
 * Encrypts data using AES-256-CBC encryption
 * @param text - The text to encrypt
 * @param secretKey - The secret key for encryption
 * @returns Encrypted data in format: iv:encryptedData
 */
export function encryptData(text: string, secretKey: string): string {
  try {
    // Create a hash of the secret key to ensure it's 32 bytes
    const key = crypto.createHash('sha256').update(secretKey).digest()
    
    // Generate a random IV
    const iv = crypto.randomBytes(IV_LENGTH)
    
    // Create cipher
    const cipher = crypto.createCipher(ALGORITHM, key)
    
    // Encrypt the text
    let encrypted = cipher.update(text, 'utf8', 'hex')
    encrypted += cipher.final('hex')
    
    // Combine IV and encrypted data
    return iv.toString('hex') + ':' + encrypted
  } catch (error) {
    console.error('Encryption error:', error)
    throw new Error('Failed to encrypt data')
  }
}

/**
 * Decrypts data using AES-256-CBC decryption
 * @param encryptedData - The encrypted data in format: iv:encryptedData
 * @param secretKey - The secret key for decryption
 * @returns Decrypted text
 */
export function decryptData(encryptedData: string, secretKey: string): string {
  try {
    // Create a hash of the secret key to ensure it's 32 bytes
    const key = crypto.createHash('sha256').update(secretKey).digest()
    
    // Split the encrypted data
    const parts = encryptedData.split(':')
    if (parts.length !== 2) {
      throw new Error('Invalid encrypted data format')
    }
    
    const iv = Buffer.from(parts[0], 'hex')
    const encrypted = parts[1]
    
    // Create decipher
    const decipher = crypto.createDecipher(ALGORITHM, key)
    
    // Decrypt the data
    let decrypted = decipher.update(encrypted, 'hex', 'utf8')
    decrypted += decipher.final('utf8')
    
    return decrypted
  } catch (error) {
    console.error('Decryption error:', error)
    throw new Error('Failed to decrypt data')
  }
}

/**
 * Generates a random string of specified length
 * @param length - The length of the random string
 * @returns Random string
 */
export function generateRandomString(length: number): string {
  return crypto.randomBytes(length).toString('hex').substring(0, length)
}

/**
 * Creates a hash of the input string
 * @param input - The string to hash
 * @param algorithm - The hash algorithm (default: 'sha256')
 * @returns Hashed string
 */
export function createHash(input: string, algorithm: string = 'sha256'): string {
  return crypto.createHash(algorithm).update(input).digest('hex')
}

/**
 * Creates an MD5 hash of the input string
 * @param input - The string to hash
 * @returns MD5 hash
 */
export function createMD5Hash(input: string): string {
  return crypto.createHash('md5').update(input).digest('hex')
}

/**
 * Verifies if a hash matches the input
 * @param input - The original string
 * @param hash - The hash to verify against
 * @param algorithm - The hash algorithm (default: 'sha256')
 * @returns True if hash matches
 */
export function verifyHash(input: string, hash: string, algorithm: string = 'sha256'): boolean {
  const inputHash = createHash(input, algorithm)
  return inputHash === hash
}




