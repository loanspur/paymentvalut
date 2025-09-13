import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    console.log('🔐 Testing RSA encryption...')
    
    // Safaricom's RSA Public Key (same as in disburse function)
    const safaricomPublicKey = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEArv9yxA69XQKBo24BaF/D
+fVjpokVj3QzlVbyLJA6b2B6sDkPLPWCjFhIVhHZHhb8q8W7tKCwIXJU+Gd0nT5+
3EXHzAoJeD4F7FZCzCzU9eZz7Z8W1QZVrF1Zw1nK9tGH9X7yZzXz2Zs9cXs8gN
4U8sQRfXzW2rFY3aHzG0gC7B4b+h1EoCz+vQ5K6z8vKs+Rw3P9TpGxN7Ef4F3E1
X8W6Y3UfP3dO1WgMrP2zW7L5dGn1RvE6lF3vMxXeEfGz2Zh4z1yXQ8V2W0cKNS
+9EhC9o1hB0jLaF9z3JW0cKNS+9EhC9o1hB0jLaF9z3JW0cKNS+9EhC9o1hB0jL
aF9z3JW0cKNS+9EhC9o1hB0jLaF9z3JQIDAQAB
-----END PUBLIC KEY-----`

    const testPassword = "testpassword123"
    
    try {
      // Import the public key (convert PEM to base64)
      const publicKeyBase64 = safaricomPublicKey
        .replace(/-----BEGIN PUBLIC KEY-----\n?/, '')
        .replace(/\n?-----END PUBLIC KEY-----/, '')
        .replace(/\n/g, '')
      
      const publicKeyBuffer = Uint8Array.from(atob(publicKeyBase64), c => c.charCodeAt(0))
      
      const publicKey = await crypto.subtle.importKey(
        'spki',
        publicKeyBuffer,
        { name: 'RSA-OAEP', hash: 'SHA-256' },
        false,
        ['encrypt']
      )
      
      // Encrypt the test password
      const encryptedData = await crypto.subtle.encrypt(
        'RSA-OAEP',
        publicKey,
        new TextEncoder().encode(testPassword)
      )
      
      // Base64 encode the encrypted result
      const securityCredential = btoa(String.fromCharCode.apply(null, Array.from(new Uint8Array(encryptedData))))
      
      return NextResponse.json({
        message: 'RSA encryption test successful',
        test_password: testPassword,
        public_key_length: publicKeyBase64.length,
        encrypted_data_length: encryptedData.byteLength,
        security_credential_length: securityCredential.length,
        security_credential_preview: securityCredential.substring(0, 50) + '...',
        status: 'success'
      })
      
    } catch (error) {
      return NextResponse.json({
        message: 'RSA encryption test failed',
        error: error instanceof Error ? error.message : 'Unknown error',
        test_password: testPassword,
        status: 'failed'
      })
    }

  } catch (error) {
    console.error('❌ Error testing RSA encryption:', error)
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
