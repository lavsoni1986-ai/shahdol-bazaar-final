/**
 * JWT VERIFICATION TEST
 * Run this to test if JWT secrets are working correctly
 */

import dotenv from 'dotenv';
import { generateTokenPair, verifyAccessToken } from './server/auth/jwt.ts';

// Load environment variables
dotenv.config();

console.log('🔑 JWT_SECRET from env:', process.env.JWT_SECRET ? 'SET' : 'NOT SET');
console.log('🔑 REFRESH_TOKEN_SECRET from env:', process.env.REFRESH_TOKEN_SECRET ? 'SET' : 'NOT SET');

try {
  // Test token generation
  const payload = {
    userId: 1,
    username: 'test_user',
    role: 'SUPER_ADMIN',
    districtId: 121,
    districtSlug: 'shahdol',
    isAdmin: true
  };

  console.log('🔧 Generating token pair...');
  const tokens = generateTokenPair(payload);
  console.log('✅ Tokens generated successfully');

  console.log('🔧 Verifying access token...');
  const decoded = verifyAccessToken(tokens.accessToken);
  console.log('✅ Token verified successfully:', {
    userId: decoded.userId,
    role: decoded.role,
    districtId: decoded.districtId
  });

  console.log('🎉 JWT system is working correctly!');

} catch (error) {
  console.error('❌ JWT test failed:', error.message);
  process.exit(1);
}