/**
 * JWT VERIFICATION TEST WITH REAL TOKEN
 * Test the actual JWT verification process
 */

import dotenv from 'dotenv';
import { verifyAccessToken } from './server/auth/jwt.ts';

// Load environment variables
dotenv.config();

console.log('🔑 Testing JWT verification with real token...');

// Use the token from localStorage (you'll need to copy it from browser)
const testToken = process.argv[2]; // Pass token as argument

if (!testToken) {
  console.log('❌ Please provide a JWT token as argument');
  console.log('Usage: node test-jwt-real.js "your_jwt_token_here"');
  process.exit(1);
}

try {
  console.log('🔐 TOKEN:', testToken.substring(0, 50) + "...");
  console.log('🔑 JWT_SECRET ENV:', process.env.JWT_SECRET ? 'SET' : 'NOT SET');

  const decoded = verifyAccessToken(testToken);
  console.log('✅ DECODED PAYLOAD:', decoded);
  console.log('✅ USER AUTHENTICATED:', {
    userId: decoded.userId,
    role: decoded.role,
    districtId: decoded.districtId,
    isAdmin: decoded.isAdmin
  });

} catch (error) {
  console.error('❌ VERIFICATION FAILED:', error instanceof Error ? error.message : error);
  process.exit(1);
}