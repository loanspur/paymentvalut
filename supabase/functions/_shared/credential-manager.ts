// Secure credential management for M-Pesa credentials
// This module handles encryption/decryption of sensitive credentials

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

interface EncryptedCredentials {
  consumer_key: string
  consumer_secret: string
  initiator_password: string
  security_credential: string
  shortcode: string
}

interface DecryptedCredentials {
  consumer_key: string
  consumer_secret: string
  initiator_password: string
  security_credential: string
  shortcode: string
}

// Simple encryption/decryption using Web Crypto API
class CredentialManager {
  private static readonly ALGORITHM = 'AES-GCM'
  private static readonly KEY_LENGTH = 256
  private static readonly IV_LENGTH = 12

  // Generate a key from a passphrase
  private static async generateKey(passphrase: string): Promise<CryptoKey> {
    const encoder = new TextEncoder()
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      encoder.encode(passphrase),
      { name: 'PBKDF2' },
      false,
      ['deriveKey']
    )

    return crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: encoder.encode('mpesa-vault-salt'),
        iterations: 100000,
        hash: 'SHA-256'
      },
      keyMaterial,
      { name: this.ALGORITHM, length: this.KEY_LENGTH },
      false,
      ['encrypt', 'decrypt']
    )
  }

  // Encrypt credentials
  static async encryptCredentials(credentials: DecryptedCredentials, passphrase: string): Promise<string> {
    try {
      const key = await this.generateKey(passphrase)
      const iv = crypto.getRandomValues(new Uint8Array(this.IV_LENGTH))
      const encoder = new TextEncoder()
      const data = encoder.encode(JSON.stringify(credentials))

      const encrypted = await crypto.subtle.encrypt(
        { name: this.ALGORITHM, iv },
        key,
        data
      )

      // Combine IV and encrypted data
      const combined = new Uint8Array(iv.length + encrypted.byteLength)
      combined.set(iv)
      combined.set(new Uint8Array(encrypted), iv.length)

      // Return base64 encoded string
      return btoa(String.fromCharCode(...combined))
    } catch (error) {
      throw new Error('Failed to encrypt credentials')
    }
  }

  // Decrypt credentials
  static async decryptCredentials(encryptedData: string, passphrase: string): Promise<DecryptedCredentials> {
    try {
      const key = await this.generateKey(passphrase)
      const combined = new Uint8Array(
        atob(encryptedData).split('').map(char => char.charCodeAt(0))
      )

      const iv = combined.slice(0, this.IV_LENGTH)
      const encrypted = combined.slice(this.IV_LENGTH)

      const decrypted = await crypto.subtle.decrypt(
        { name: this.ALGORITHM, iv },
        key,
        encrypted
      )

      const decoder = new TextDecoder()
      const decryptedText = decoder.decode(decrypted)
      return JSON.parse(decryptedText)
    } catch (error) {
      throw new Error('Failed to decrypt credentials')
    }
  }

  // Get credentials for a partner (with decryption)
  static async getPartnerCredentials(partnerId: string, passphrase: string, partnerData?: any): Promise<DecryptedCredentials> {
    const supabaseUrl = Deno.env.get('NEXT_PUBLIC_SUPABASE_URL') || Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase environment variables')
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    let partner
    if (partnerData) {
      // Use provided partner data
      partner = partnerData
    } else {
      // Try to get credentials from database, but handle missing columns gracefully
      try {
        const { data: partnerResult, error } = await supabase
          .from('partners')
          .select('encrypted_credentials, consumer_key, consumer_secret, initiator_password, security_credential, mpesa_shortcode, mpesa_environment')
          .eq('id', partnerId)
          .single()

        if (error || !partnerResult) {
          throw new Error('Partner not found')
        }
        partner = partnerResult
      } catch (selectError) {
        // If credential columns don't exist, try with basic columns only
        // Credential columns not found, trying basic columns
        const { data: partnerResult, error } = await supabase
          .from('partners')
          .select('id, name, mpesa_shortcode, mpesa_environment')
          .eq('id', partnerId)
          .single()

        if (error || !partnerResult) {
          throw new Error('Partner not found')
        }
        partner = partnerResult
      }
    }

    // Check partner data availability

    // Try to use encrypted credentials first
    if (partner.encrypted_credentials) {
      try {
        // Attempting to decrypt vault credentials
        return await this.decryptCredentials(partner.encrypted_credentials, passphrase)
      } catch (decryptError) {
        // Vault decryption failed, falling back to plain text credentials
        // Fall through to use plain text credentials
      }
    }

    // Fallback to plain text credentials if encrypted ones are not available or fail to decrypt
    if (partner.consumer_key && partner.consumer_secret && partner.initiator_password) {
      // Using plain text credentials as fallback
      return {
        consumer_key: partner.consumer_key,
        consumer_secret: partner.consumer_secret,
        initiator_password: partner.initiator_password,
        security_credential: partner.security_credential || partner.initiator_password,
        shortcode: partner.mpesa_shortcode || '',
        environment: partner.mpesa_environment || 'sandbox'
      }
    }

    throw new Error(`No valid credentials found for partner ${partnerId}. Missing: ${[
      !partner.consumer_key && 'consumer_key',
      !partner.consumer_secret && 'consumer_secret', 
      !partner.initiator_password && 'initiator_password'
    ].filter(Boolean).join(', ')}`)
  }

  // Store encrypted credentials for a partner
  static async storePartnerCredentials(
    partnerId: string, 
    credentials: DecryptedCredentials, 
    passphrase: string
  ): Promise<void> {
    const supabaseUrl = Deno.env.get('NEXT_PUBLIC_SUPABASE_URL') || Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase environment variables')
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Encrypt credentials
    const encryptedCredentials = await this.encryptCredentials(credentials, passphrase)

    // Store in database
    const { error } = await supabase
      .from('partners')
      .update({ 
        encrypted_credentials: encryptedCredentials,
        updated_at: new Date().toISOString()
      })
      .eq('id', partnerId)

    if (error) {
      throw new Error(`Failed to store encrypted credentials: ${error.message}`)
    }
  }
}

export { CredentialManager, type DecryptedCredentials, type EncryptedCredentials }


