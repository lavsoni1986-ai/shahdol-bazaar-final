import { randomBytes, scryptSync, timingSafeEqual } from 'crypto';

/**
 * ============================================
 * PASSWORD VALIDATION & HASHING
 * ============================================
 * PHASE 1 Security Fix: Strong password policy
 * 
 * Requirements:
 * - Minimum 8 characters
 * - At least 1 uppercase letter
 * - At least 1 lowercase letter  
 * - At least 1 number
 * 
 * Uses scrypt for password hashing (memory-hard function)
 * with timing-safe comparison to prevent timing attacks.
 */

/**
 * Password strength validation result
 */
export interface PasswordValidationResult {
  valid: boolean;
  errors: string[];
  strength?: 'weak' | 'medium' | 'strong';
}

/**
 * Password strength requirements
 */
export const PASSWORD_REQUIREMENTS = {
  minLength: 8,
  maxLength: 100,
  requireUppercase: true,
  requireLowercase: true,
  requireNumber: true,
  requireSpecial: false, // Optional - not required per task
} as const;

/**
 * Validate password strength
 * 
 * @param password - The password to validate
 * @returns PasswordValidationResult with validation status and any errors
 * 
 * @example
 * const result = validatePasswordStrength("MyPass123");
 * if (!result.valid) {
 *   console.log(result.errors);
 * }
 */
export function validatePasswordStrength(password: string): PasswordValidationResult {
  const errors: string[] = [];
  
  // Check minimum length
  if (!password || password.length < PASSWORD_REQUIREMENTS.minLength) {
    errors.push(`Password must be at least ${PASSWORD_REQUIREMENTS.minLength} characters long`);
  }
  
  // Check maximum length
  if (password && password.length > PASSWORD_REQUIREMENTS.maxLength) {
    errors.push(`Password must not exceed ${PASSWORD_REQUIREMENTS.maxLength} characters`);
  }
  
  // Check uppercase
  if (PASSWORD_REQUIREMENTS.requireUppercase && !/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter (A-Z)');
  }
  
  // Check lowercase
  if (PASSWORD_REQUIREMENTS.requireLowercase && !/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter (a-z)');
  }
  
  // Check number
  if (PASSWORD_REQUIREMENTS.requireNumber && !/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number (0-9)');
  }
  
  // Determine password strength if valid
  let strength: 'weak' | 'medium' | 'strong' | undefined;
  if (errors.length === 0) {
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);
    const hasUpperAndLower = /[A-Z]/.test(password) && /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const length = password.length;
    
    if (length >= 12 && hasSpecial && hasUpperAndLower && hasNumber) {
      strength = 'strong';
    } else if (length >= 8 && hasUpperAndLower && hasNumber) {
      strength = 'medium';
    } else {
      strength = 'weak';
    }
  }
  
  return {
    valid: errors.length === 0,
    errors,
    strength
  };
}

/**
 * Validate password strength synchronously (for use in validators)
 * 
 * @throws Error with descriptive message if password doesn't meet requirements
 */
export function validatePasswordSync(password: string): void {
  const validation = validatePasswordStrength(password);
  if (!validation.valid) {
    throw new Error(validation.errors.join('; '));
  }
}

/**
 * Hash password using scrypt
 * 
 * SECURITY: Uses scrypt with:
 * - 16 byte salt (random for each password)
 * - 64 byte output (512 bits)
 * - Timing-safe comparison
 * 
 * @param password - Plain text password to hash
 * @returns Hashed password in format "salt:hash" (hex encoded)
 * @throws Error if password doesn't meet strength requirements
 */
export function hashPassword(password: string): string {
  // First validate password strength
  const validation = validatePasswordStrength(password);
  if (!validation.valid) {
    throw new Error(validation.errors.join('; '));
  }
  
  const salt = randomBytes(16).toString('hex'); // 16 bytes = 32 hex chars
  const hash = scryptSync(password, salt, 64).toString('hex'); // 64 bytes = 128 hex chars
  
  return `${salt}:${hash}`;
}

/**
 * Verify password against stored hash
 * 
 * SECURITY: Uses timingSafeEqual to prevent timing attacks
 * 
 * @param password - Plain text password to verify
 * @param stored - Stored hash in format "salt:hash"
 * @returns true if password matches, false otherwise
 */
export function verifyPassword(password: string, stored: string): boolean {
  // Early return for invalid inputs
  if (!stored || !password) {
    return false;
  }
  
  const parts = stored.split(':');
  
  // STRICT VALIDATION: Must be in salt:hash format
  // NO PLAINTEXT FALLBACK - prevents legacy password attacks
  if (parts.length !== 2) {
    console.warn('⚠️ [SECURITY] Attempted login with invalid password format. Plaintext passwords are not supported.');
    return false;
  }
  
  const [salt, storedHash] = parts;
  
  // Validate hash format (salt: 32 hex, hash: 128 hex)
  if (!salt || !storedHash || salt.length !== 32 || storedHash.length !== 128) {
    console.warn('⚠️ [SECURITY] Invalid password hash format detected. Hash may be corrupted.');
    return false;
  }
  
  try {
    // Generate hash from provided password
    const hash = scryptSync(password, salt, 64);
    const hashBuf = Buffer.from(storedHash, 'hex');
    
    // Verify length match
    if (hashBuf.length !== hash.length) {
      return false;
    }
    
    // TIMING-SAFE COMPARISON: Prevents timing attacks
    // Constant time comparison regardless of where the mismatch occurs
    return timingSafeEqual(hash, hashBuf);
  } catch (error) {
    console.error('Password verification error:', error);
    return false;
  }
}

/**
 * Check if stored password needs to be rehashed
 * 
 * Use this to detect legacy password formats that need updating
 * 
 * @param stored - Stored password hash
 * @returns true if password needs rehashing
 */
export function needsRehash(stored: string): boolean {
  if (!stored) return true;
  
  const parts = stored.split(':');
  
  // Not in current format (salt:hash)
  if (parts.length !== 2) return true;
  
  // Invalid salt or hash length
  const [salt, hash] = parts;
  if (salt.length !== 32 || hash.length !== 128) return true;
  
  return false;
}

/**
 * Generate a secure random password (for password reset functionality)
 * 
 * @param length - Password length (default: 12)
 * @returns Generated secure password
 */
export function generateSecurePassword(length: number = 12): string {
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const numbers = '0123456789';
  const special = '!@#$%^&*';
  
  const allChars = uppercase + lowercase + numbers + special;
  
  // Ensure at least one of each required character type
  let password = '';
  password += uppercase[randomBytes(1).readUInt8(0) % uppercase.length];
  password += lowercase[randomBytes(1).readUInt8(0) % lowercase.length];
  password += numbers[randomBytes(1).readUInt8(0) % numbers.length];
  password += special[randomBytes(1).readUInt8(0) % special.length];
  
  // Fill remaining length
  for (let i = password.length; i < length; i++) {
    password += allChars[randomBytes(1).readUInt8(0) % allChars.length];
  }
  
  // Shuffle the password
  return password.split('').sort(() => randomBytes(1).readUInt8(0) - 128).join('');
}

export default {
  validatePasswordStrength,
  validatePasswordSync,
  hashPassword,
  verifyPassword,
  needsRehash,
  generateSecurePassword,
  PASSWORD_REQUIREMENTS
};
