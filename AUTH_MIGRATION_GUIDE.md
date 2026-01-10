# 🔐 Authentication System Migration Guide

## Overview

Your Shahdol Bazaar backend has been upgraded to enterprise-grade JWT-based authentication with Role-Based Access Control (RBAC).

## ✅ What Changed

### 1. **Authentication Method**
- **Before**: localStorage + header-based (insecure)
- **After**: JWT tokens (Access + Refresh tokens)

### 2. **Password Security**
- **Before**: Plaintext fallback support
- **After**: Strict scrypt-only hashing (no plaintext)

### 3. **Role System**
- **Before**: `admin`, `seller`, `customer`
- **After**: `SUPER_ADMIN`, `CITY_ADMIN`, `MERCHANT`, `CUSTOMER`

### 4. **Route Protection**
- All admin routes now require `SUPER_ADMIN` role
- Merchant routes require `MERCHANT` or higher
- City admin routes require `CITY_ADMIN` or higher

## 🔧 Environment Variables

Add these to your `.env` file:

```env
# JWT Secrets (REQUIRED - Generate strong random strings)
JWT_SECRET=your-super-secret-jwt-key-min-64-characters-long
REFRESH_TOKEN_SECRET=your-super-secret-refresh-key-min-64-characters-long

# Session Secret (optional, for backward compatibility)
SESSION_SECRET=your-session-secret

# Node Environment
NODE_ENV=production
```

**Generate secrets:**
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

## 📋 API Changes

### Login Response Format Changed

**Before:**
```json
{
  "id": 1,
  "username": "admin",
  "role": "admin",
  "isAdmin": true
}
```

**After:**
```json
{
  "accessToken": "eyJhbGc...",
  "user": {
    "id": 1,
    "username": "admin",
    "role": "SUPER_ADMIN",
    "isAdmin": true,
    "shopId": null
  }
}
```

### New Endpoints

#### POST `/api/auth/refresh`
Refresh access token using refresh token cookie.

**Request:** No body, uses `refreshToken` cookie

**Response:**
```json
{
  "accessToken": "eyJhbGc...",
  "user": { ... }
}
```

#### POST `/api/auth/logout`
Clear refresh token cookie.

**Response:**
```json
{
  "message": "Logged out successfully"
}
```

### Protected Routes

All routes now require `Authorization: Bearer <accessToken>` header except:
- `POST /api/login`
- `POST /api/register`
- `GET /api/health`
- `GET /api/products` (public listing)
- `GET /api/products/:id` (public view)
- `GET /api/shops` (public listing)
- `GET /api/banners` (public)
- `GET /api/offers` (public)
- `GET /api/categories` (public)

## 🔑 Token Details

### Access Token
- **Expiry**: 15 minutes
- **Format**: JWT
- **Contains**: `userId`, `username`, `role`, `shopId`
- **Storage**: Client-side (localStorage/memory)
- **Usage**: Send in `Authorization: Bearer <token>` header

### Refresh Token
- **Expiry**: 7 days
- **Format**: JWT
- **Contains**: `userId`, `username`
- **Storage**: HTTP-only cookie (secure)
- **Usage**: Automatically sent with requests

## 🎭 Role Mapping

Legacy roles are automatically mapped:

| Legacy Role | New Role | Access Level |
|------------|----------|--------------|
| `admin` (isAdmin=true) | `SUPER_ADMIN` | Full access |
| `seller` / `merchant` | `MERCHANT` | Shop management |
| `city_admin` | `CITY_ADMIN` | City-level admin |
| `customer` (default) | `CUSTOMER` | Basic access |

## 🔒 Route Protection Matrix

| Route | Required Role | Notes |
|-------|--------------|-------|
| `/api/products/all` | `SUPER_ADMIN` | Admin product list |
| `/api/products` (POST) | `MERCHANT`+ | Create product |
| `/api/products/:id` (PATCH) | `MERCHANT`+ | Own products only |
| `/api/products/:id/approve` | `SUPER_ADMIN` | Approve products |
| `/api/banners/*` | `SUPER_ADMIN` | Banner management |
| `/api/categories/*` | `SUPER_ADMIN` | Category management |
| `/api/offers/*` | `CITY_ADMIN`+ | Offers/news ticker |
| `/api/reviews` (GET all) | `SUPER_ADMIN` | Review moderation |
| `/api/reviews/:id/approve` | `SUPER_ADMIN` | Approve reviews |
| `/api/partner/shop/*` | `MERCHANT`+ | Partner dashboard |
| `/api/user/profile` | Authenticated | Own profile |

## 📱 Frontend Integration

### 1. Update Login Handler

```typescript
// Before
const response = await fetch('/api/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ username, password })
});
const user = await response.json();
localStorage.setItem('user', JSON.stringify(user));

// After
const response = await fetch('/api/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ username, password }),
  credentials: 'include' // Important for cookies!
});
const { accessToken, user } = await response.json();
localStorage.setItem('accessToken', accessToken);
localStorage.setItem('user', JSON.stringify(user));
```

### 2. Add Authorization Header to API Requests

```typescript
const accessToken = localStorage.getItem('accessToken');
const response = await fetch('/api/products', {
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json'
  },
  credentials: 'include'
});
```

### 3. Implement Token Refresh

```typescript
async function refreshAccessToken() {
  const response = await fetch('/api/auth/refresh', {
    method: 'POST',
    credentials: 'include'
  });
  
  if (response.ok) {
    const { accessToken, user } = await response.json();
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('user', JSON.stringify(user));
    return accessToken;
  }
  
  // Token expired, redirect to login
  localStorage.clear();
  window.location.href = '/auth';
  throw new Error('Session expired');
}

// Auto-refresh before token expires (14 minutes)
setInterval(async () => {
  try {
    await refreshAccessToken();
  } catch (e) {
    console.error('Token refresh failed:', e);
  }
}, 14 * 60 * 1000);
```

### 4. Handle 401 Errors

```typescript
async function apiRequest(url: string, options: RequestInit = {}) {
  const accessToken = localStorage.getItem('accessToken');
  
  const response = await fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      'Authorization': `Bearer ${accessToken}`,
    },
    credentials: 'include'
  });
  
  if (response.status === 401) {
    // Try to refresh token
    try {
      const newToken = await refreshAccessToken();
      // Retry with new token
      return fetch(url, {
        ...options,
        headers: {
          ...options.headers,
          'Authorization': `Bearer ${newToken}`,
        },
        credentials: 'include'
      });
    } catch (e) {
      // Refresh failed, redirect to login
      window.location.href = '/auth';
      throw e;
    }
  }
  
  return response;
}
```

## 🔄 Backward Compatibility

- Old password hashes still work (scrypt format)
- Legacy roles are automatically mapped to new roles
- `x-user-id` header is still set for backward compatibility
- Session middleware is kept (though JWT is primary)

## ⚠️ Breaking Changes

1. **Login response format changed** - Update frontend to handle new format
2. **Plaintext passwords rejected** - Users with plaintext passwords need password reset
3. **Routes now require authentication** - Public routes are explicitly marked
4. **Role names changed** - Frontend should use new role constants

## 🚀 Migration Steps

1. **Add environment variables** (see above)
2. **Update frontend login handler** to store accessToken
3. **Add Authorization headers** to all API requests
4. **Implement token refresh** logic
5. **Update role checks** to use new role constants
6. **Test all flows** thoroughly

## 🐛 Troubleshooting

### "Invalid or expired token"
- Check if accessToken is being sent in Authorization header
- Verify token hasn't expired (15 minutes)
- Try refreshing token

### "Authentication required"
- Ensure `Authorization: Bearer <token>` header is present
- Check token is valid JWT format
- Verify credentials: 'include' is set for cookie-based refresh

### "Insufficient permissions"
- Check user role matches required role
- Verify role mapping is correct
- SUPER_ADMIN has access to everything

### "Too many login attempts"
- Rate limit: 5 attempts per 15 minutes
- Wait 15 minutes or contact admin

## 📚 Additional Resources

- JWT documentation: https://jwt.io/
- Helmet security: https://helmetjs.github.io/
- Rate limiting: https://www.npmjs.com/package/express-rate-limit

## 🔐 Security Best Practices

1. **Never store refresh token in localStorage** - It's in HTTP-only cookie
2. **Rotate secrets regularly** - Change JWT secrets periodically
3. **Use HTTPS in production** - Required for secure cookies
4. **Implement token blacklisting** - For logout/suspicious activity (future enhancement)
5. **Monitor failed login attempts** - Watch for brute force attacks
