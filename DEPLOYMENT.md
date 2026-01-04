# 🚀 Shahdol Bazaar - Deployment Guide

## Production Build Status
✅ Build completed successfully!
- Client: Built and optimized
- Server: Bundled and ready
- Output: `dist/` folder

## Deployment Options

### Option 1: Deploy to Replit (Recommended for Quick Launch)

1. **Push to Replit:**
   - Your project already has `.replit` configuration
   - Simply push your code to Replit
   - Replit will automatically detect the configuration

2. **Run in Production:**
   ```bash
   npm run build
   npm start
   ```

3. **Get Your Public Link:**
   - Replit will provide: `your-project-name.replit.app`
   - Or use custom domain if configured

4. **Environment Setup:**
   - Port: 5000 (configured in .replit)
   - Public port: 80 (external)

### Option 2: Deploy to Vercel

1. **Install Vercel CLI:**
   ```bash
   npm i -g vercel
   ```

2. **Deploy:**
   ```bash
   vercel --prod
   ```

3. **Configure:**
   - Vercel will auto-detect the `vercel.json` configuration
   - API routes will be handled by the Node.js server
   - Static files will be served from `dist/`

4. **Get Your Public Link:**
   - Vercel will provide: `your-project.vercel.app`
   - Or connect custom domain: `shahdolbazaar.com`

### Option 3: Deploy to Railway

1. **Create Railway Project:**
   - Connect your GitHub repo
   - Railway will auto-detect Node.js

2. **Configure:**
   - Build Command: `npm run build`
   - Start Command: `npm start`
   - Port: Railway auto-assigns (use `PORT` env var)

3. **Get Your Public Link:**
   - Railway provides: `your-project.up.railway.app`

## Environment Variables (if needed)

For production, you may want to set:
- `NODE_ENV=production`
- `PORT=5000` (or your platform's port)

## Post-Deployment Checklist

- [ ] Test admin login: `admin` / `admin123`
- [ ] Test seller registration and login
- [ ] Verify shop creation works
- [ ] Test product listing and search
- [ ] Check mobile responsiveness
- [ ] Test cart functionality
- [ ] Verify API endpoints are working

## Support

If you encounter issues:
1. Check server logs
2. Verify environment variables
3. Ensure build completed successfully
4. Check port configuration

