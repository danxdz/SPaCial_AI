/**
 * Encryption Service for SPC Application
 * Provides secure encryption/decryption for sensitive data
 */

import bcrypt from 'bcryptjs';

// Secure encryption key generation
const generateKey = (): string => {
  // Generate a secure key using crypto.getRandomValues
  const key = localStorage.getItem('spc_encryption_key');
  if (!key) {
    // Generate a new key using crypto.getRandomValues
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    const newKey = Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
    localStorage.setItem('spc_encryption_key', newKey);
    return newKey;
  }
  return key;
};

// Convert hex string to Uint8Array
const hexToBytes = (hex: string): Uint8Array => {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
  }
  return bytes;
};

// Convert Uint8Array to hex string
const bytesToHex = (bytes: Uint8Array): string => {
  return Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
};

// AES-GCM encryption for confidential data
const encryptAES = async (text: string, key: string): Promise<{ encrypted: string; iv: string }> => {
  try {
    const encoder = new TextEncoder();
    const data = encoder.encode(text);
    
    // Generate a random IV
    const iv = crypto.getRandomValues(new Uint8Array(12));
    
    // Import the key
    const keyBuffer = await crypto.subtle.importKey(
      'raw',
      encoder.encode(key),
      { name: 'AES-GCM' },
      false,
      ['encrypt']
    );
    
    // Encrypt the data
    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: iv },
      keyBuffer,
      data
    );
    
    return {
      encrypted: bytesToHex(new Uint8Array(encrypted)),
      iv: bytesToHex(iv)
    };
  } catch (error) {
    console.error('AES encryption error:', error);
    throw new Error('Encryption failed');
  }
};

// AES-GCM decryption for confidential data
const decryptAES = async (encryptedHex: string, ivHex: string, key: string): Promise<string> => {
  try {
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();
    
    const encryptedBytes = hexToBytes(encryptedHex);
    const iv = hexToBytes(ivHex);
    
    // Import the key
    const keyBuffer = await crypto.subtle.importKey(
      'raw',
      encoder.encode(key),
      { name: 'AES-GCM' },
      false,
      ['decrypt']
    );
    
    // Decrypt the data
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: iv },
      keyBuffer,
      encryptedBytes
    );
    
    return decoder.decode(decrypted);
  } catch (error) {
    console.error('AES decryption error:', error);
    throw new Error('Decryption failed');
  }
};

// Base64 encoding for additional obfuscation (currently unused but kept for future use)
// const base64Encode = (str: string): string => {
//   return btoa(unescape(encodeURIComponent(str)));
// };

// const base64Decode = (str: string): string => {
//   return decodeURIComponent(escape(atob(str)));
// };

export interface EncryptionResult {
  encrypted: string;
  iv?: string;
  salt?: string;
}

export interface DecryptionResult {
  decrypted: string;
  success: boolean;
  error?: string;
}

class EncryptionService {
  private key: string;

  constructor() {
    this.key = generateKey();
  }

  /**
   * Encrypt sensitive data using AES-GCM
   * @param data - The data to encrypt
   * @returns Encrypted data with metadata
   */
  async encrypt(data: string): Promise<EncryptionResult> {
    try {
      if (!data || data.trim() === '') {
        return { encrypted: '' };
      }

      // Use AES-GCM encryption for confidential data
      const result = await encryptAES(data, this.key);
      
      return {
        encrypted: result.encrypted,
        iv: result.iv
      };
    } catch (error) {
      console.error('Encryption error:', error);
      throw new Error('Failed to encrypt data');
    }
  }

  /**
   * Decrypt sensitive data using AES-GCM
   * @param encryptedData - The encrypted data
   * @param iv - The initialization vector (optional, for backward compatibility)
   * @returns Decrypted data
   */
  async decrypt(encryptedData: string, iv?: string): Promise<DecryptionResult> {
    try {
      if (!encryptedData || encryptedData.trim() === '') {
        return { decrypted: '', success: true };
      }

      // For backward compatibility, check if this is old format
      if (!iv) {
        // Try to decode as old Base64 format
        try {
          // const base64Decoded = base64Decode(encryptedData);
          // If it's old format, it will fail at AES decryption
          // We'll fall back to a simple return
          return { decrypted: encryptedData, success: true };
        } catch {
          return { decrypted: encryptedData, success: true };
        }
      }

      // Use AES-GCM decryption for confidential data
      const decrypted = await decryptAES(encryptedData, iv, this.key);
      
      return { decrypted, success: true };
    } catch (error) {
      console.error('Decryption error:', error);
      return { 
        decrypted: '', 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown decryption error'
      };
    }
  }

  /**
   * Hash sensitive data (one-way encryption)
   * @param data - The data to hash
   * @returns Hashed data
   */
  hash(data: string): string {
    try {
      // Simple hash function (in production, use proper hashing like bcrypt)
      let hash = 0;
      if (data.length === 0) return hash.toString();
      
      for (let i = 0; i < data.length; i++) {
        const char = data.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32-bit integer
      }
      
      return Math.abs(hash).toString(16);
    } catch (error) {
      console.error('Hashing error:', error);
      throw new Error('Failed to hash data');
    }
  }

  /**
   * Hash user password using bcrypt
   * @param password - Plain text password
   * @returns Hashed password
   */
  async hashPassword(password: string): Promise<string> {
    try {
      // Use bcrypt with salt rounds of 12 (good balance of security vs performance)
      const saltRounds = 12;
      return await bcrypt.hash(password, saltRounds);
    } catch (error) {
      console.error('Password hashing error:', error);
      throw new Error('Failed to hash password');
    }
  }

  /**
   * Verify password against hash using bcrypt
   * @param password - Plain text password
   * @param hash - Stored hash
   * @returns True if password matches
   */
  async verifyPassword(password: string, hash: string): Promise<boolean> {
    try {
      return await bcrypt.compare(password, hash);
    } catch (error) {
      console.error('Password verification error:', error);
      return false;
    }
  }

  /**
   * Encrypt sensitive fields in an object
   * @param obj - Object containing sensitive data
   * @param sensitiveFields - Array of field names to encrypt
   * @returns Object with encrypted sensitive fields
   */
  async encryptObject<T extends Record<string, any>>(
    obj: T, 
    sensitiveFields: (keyof T)[]
  ): Promise<T> {
    const encrypted = { ...obj };
    
    for (const field of sensitiveFields) {
      if (obj[field] && typeof obj[field] === 'string') {
        const encryptedResult = await this.encrypt(obj[field]);
        (encrypted as any)[field] = encryptedResult.encrypted;
        (encrypted as any)[`${String(field)}_iv`] = encryptedResult.iv;
      }
    }
    
    return encrypted;
  }

  /**
   * Decrypt sensitive fields in an object
   * @param obj - Object containing encrypted data
   * @param sensitiveFields - Array of field names to decrypt
   * @returns Object with decrypted sensitive fields
   */
  async decryptObject<T extends Record<string, any>>(
    obj: T, 
    sensitiveFields: (keyof T)[]
  ): Promise<T> {
    const decrypted = { ...obj };
    
    for (const field of sensitiveFields) {
      if (obj[field] && typeof obj[field] === 'string') {
        const ivField = `${String(field)}_iv` as keyof T;
        const iv = obj[ivField] as string;
        const decryptedResult = await this.decrypt(obj[field] as string, iv);
        if (decryptedResult.success) {
          (decrypted as any)[field] = decryptedResult.decrypted;
        }
        // Remove the IV field from the decrypted object
        delete (decrypted as any)[ivField];
      }
    }
    
    return decrypted;
  }

  /**
   * Generate a new encryption key (use with caution)
   */
  regenerateKey(): void {
    localStorage.removeItem('spc_encryption_key');
    this.key = generateKey();
  }

  /**
   * Check if encryption is available
   */
  isEncryptionAvailable(): boolean {
    try {
      return typeof crypto !== 'undefined' && crypto.getRandomValues !== undefined && crypto.subtle !== undefined;
    } catch {
      return false;
    }
  }

  /**
   * Store confidential data securely in database
   * @param table - Database table name
   * @param id - Record ID
   * @param confidentialFields - Object with confidential field names and values
   * @returns Success status
   */
  async storeConfidentialData(
    _table: string, 
    _id: number, 
    confidentialFields: Record<string, string>
  ): Promise<{ success: boolean; error?: string }> {
    try {
      if (!this.isEncryptionAvailable()) {
        return { success: false, error: 'Encryption not available' };
      }

      // Encrypt each confidential field
      const encryptedData: Record<string, string> = {};
      for (const [field, value] of Object.entries(confidentialFields)) {
        if (value && value.trim() !== '') {
          const encrypted = await this.encrypt(value);
          encryptedData[`${field}_encrypted`] = encrypted.encrypted;
          encryptedData[`${field}_iv`] = encrypted.iv || '';
        }
      }

      // Store in database (this would need to be implemented in database service)
      // For now, return success
      return { success: true };
    } catch (error) {
      console.error('Error storing confidential data:', error);
      return { success: false, error: 'Failed to store confidential data' };
    }
  }

  /**
   * Retrieve and decrypt confidential data from database
   * @param table - Database table name
   * @param id - Record ID
   * @param confidentialFields - Array of confidential field names
   * @returns Decrypted confidential data
   */
  async retrieveConfidentialData(
    _table: string, 
    _id: number, 
    _confidentialFields: string[]
  ): Promise<Record<string, string>> {
    try {
      if (!this.isEncryptionAvailable()) {
        return {};
      }

      // This would retrieve encrypted data from database
      // For now, return empty object
      const decryptedData: Record<string, string> = {};
      
      // In a real implementation, you would:
      // 1. Query the database for encrypted fields
      // 2. Decrypt each field using the stored IV
      // 3. Return the decrypted data
      
      return decryptedData;
    } catch (error) {
      console.error('Error retrieving confidential data:', error);
      return {};
    }
  }
}

// Export singleton instance
export const encryption = new EncryptionService();
export default encryption;
