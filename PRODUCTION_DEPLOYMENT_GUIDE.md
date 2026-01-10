# Production Deployment Guide - Shahdol Bazaar MVP

## ✅ Pre-Deployment Checklist

### 1. Environment Variables Setup

Add these in **Vercel Dashboard > Settings > Environment Variables**:

#### Required Variables:
```
DATABASE_URL=postgres://... (Neon PostgreSQL pooler URL)
JWT_SECRET=<generate-random-32-char-string>
REFRESH_TOKEN_SECRET=<generate-random-32-char-string>
CLOUDINARY_CLOUD_NAME=<your-cloud-name>
CLOUDINARY_API_KEY=<your-api-key>
CLOUDINARY_API_SECRET=<your-api-secret>
NODE_ENV=production
```

#### Optional Variables:
```
SESSION_SECRET=<optional-falls-back-to-JWT_SECRET>
VITE_API_URL=<leave-empty-in-production>
```

### 2. Database Setup

1. **Neon Database**:
   - Create database at https://console.neon.tech
   - Use **pooler URL** (port 5432 / -pooler suffix)
   - Run migrations: `npm run db:push`
   - Verify connection: Check `/api/health` endpoint

2. **Database Migrations**:
   ```bash
   npm run db:push
   ```

### 3. Build & Test Locally

```bash
# Install dependencies
npm install

# Build for production
npm run build

# Test production build locally
npm start
```

### 4. Vercel Deployment

#### Option A: GitHub Integration (Recommended)
1. Push code to GitHub
2. Connect repo to Vercel
3. Configure build settings:
   - **Framework Preset**: Other
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`
4. Add environment variables
5. Deploy

#### Option B: Vercel CLI
```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy
vercel --prod
```

### 5. Post-Deployment Verification

#### Health Checks:
- ✅ `/api/health` - Database connection
- ✅ `/api/health-fn` - Function availability
- ✅ `/` - Homepage loads
- ✅ `/admin` - Admin login works
- ✅ `/auth` - Auth page works

#### PWA Checks:
- ✅ Service worker registers (`/sw.js`)
- ✅ Manifest loads (`/manifest.json`)
- ✅ Install prompt appears
- ✅ App installs on mobile

#### Security Checks:
- ✅ HTTPS enabled
- ✅ CORS configured correctly
- ✅ Authentication required for protected routes
- ✅ Rate limiting active

## 🔧 Common Issues & Fixes

### Issue 1: API Routes Return 404

**Fix**: Check `vercel.json` rewrites:
```json
{
  "rewrites": [
    { "source": "/api/(.*)", "destination": "/api/index" }
  ]
}
```

### Issue 2: Database Connection Timeout

**Fix**: 
- Use Neon **pooler URL** (not direct connection)
- Remove `channel_binding` param from DATABASE_URL
- Check network restrictions in Neon dashboard

### Issue 3: PWA Install Prompt Not Showing

**Fix**:
- Verify service worker registers (check console)
- Check manifest.json is accessible
- Ensure HTTPS (required for PWA)
- Clear browser cache and re-test

### Issue 4: Cloudinary Images Not Loading

**Fix**:
- Verify CLOUDINARY_* env variables are set
- Check CSP headers allow Cloudinary domains
- Verify Cloudinary account is active

### Issue 5: CORS Errors

**Fix**: Update `server/index.ts` allowed origins:
```typescript
const allowedOrigins = [
  "https://your-domain.vercel.app",
  "https://your-domain.com",
  // Add all production domains
];
```

## 📊 Monitoring & Logging

### Vercel Logs
- View logs: `vercel logs [deployment-url]`
- Real-time logs: Vercel Dashboard > Deployments > View Logs

### Error Tracking
- Check Vercel Function Logs for API errors
- Browser Console for frontend errors
- Database logs in Neon dashboard

## 🚀 Performance Optimization

### 1. Enable Edge Caching
Add to `vercel.json`:
```json
{
  "headers": [
    {
      "source": "/(.*\\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2))",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=31536000, immutable"
        }
      ]
    }
  ]
}
```

### 2. Database Connection Pooling
- Already configured with Neon pooler
- Monitor connection usage in Neon dashboard

### 3. Image Optimization
- Use Cloudinary for automatic optimization
- Lazy load images in React components

## 🔒 Security Best Practices

1. **Secrets Management**:
   - Never commit secrets to git
   - Use Vercel Environment Variables
   - Rotate secrets periodically

2. **Rate Limiting**:
   - Already configured in `server/auth/rateLimiter.ts`
   - Login: 5 attempts per 15 minutes
   - API: 100 requests per 15 minutes

3. **CORS**:
   - Whitelist only production domains
   - Don't use `origin: "*"` in production

4. **HTTPS**:
   - Vercel automatically enables HTTPS
   - Verify certificate is valid

## 📱 Mobile Testing

### Test on Real Devices:
1. Scan QR code or open URL on phone
2. Verify PWA install prompt appears
3. Install app and test offline functionality
4. Test all core features (browse, cart, checkout)

### PWA Requirements Checklist:
- ✅ HTTPS enabled
- ✅ Service worker registered
- ✅ Manifest.json valid
- ✅ Icons provided (192x192, 512x512)
- ✅ Start URL specified
- ✅ Display mode set to "standalone"

## 🎯 White-Label Deployment (District-Level)

### For Multiple Districts:

1. **Environment Variables per Project**:
   - Create separate Vercel projects for each district
   - Use different DATABASE_URL for each
   - Customize branding per district

2. **Database Schema**:
   - Consider adding `district` column to shops/products
   - Filter by district in queries
   - Or use separate databases per district

3. **Domain Configuration**:
   - Set custom domain per Vercel project
   - Use district name in domain (e.g., shahdolbazaar.com, rewa-bazaar.com)

4. **Branding**:
   - Update manifest.json per district
   - Customize theme colors
   - Update logos and icons

## 📞 Support & Troubleshooting

### Debug Mode:
Set `NODE_ENV=development` temporarily to see detailed logs

### Health Check Endpoints:
- `/api/health` - Full health check (tests DB)
- `/api/health-fn` - Function-only check

### Common Commands:
```bash
# View logs
vercel logs --follow

# Check deployment status
vercel list

# Rollback deployment
vercel rollback

# Redeploy
vercel --prod
```

---

**Last Updated**: 2024-01-04
**Version**: 1.0.0
