# 🚀 Running E2E Tests - Quick Guide

## Prerequisites

1. **Update Base URL** in `playwright.config.ts`:
   ```typescript
   baseURL: 'https://your-actual-vercel-url.vercel.app',
   ```

2. **Ensure Admin User Exists**:
   - Username: `admin`
   - Password: `shahdol123`
   - Role: `SUPER_ADMIN` or `admin`

3. **Server Must Be Running** (if testing locally)

## Quick Start

```bash
# Run all tests
npm run test

# Run in headed mode (see browser)
npm run test:headed

# Run specific test suite
npx playwright test tests/e2e-complete-flow.spec.ts

# Run with UI mode (recommended)
npm run test:ui
```

## Test Coverage

### ✅ Test Suite 1: Authentication (e2e-auth.spec.ts)
- Customer registration
- Merchant registration
- Login flow
- Invalid credentials

### ✅ Test Suite 2: Product Upload (e2e-product-upload.spec.ts)
- Create product as merchant
- View merchant products
- Unauthorized access blocked

### ✅ Test Suite 3: Admin Approval (e2e-admin-approval.spec.ts)
- View pending products
- Approve product
- Reject product
- Non-admin cannot approve

### ✅ Test Suite 4: Marketplace (e2e-marketplace-visibility.spec.ts)
- Only approved products visible
- Product details page
- Pending products hidden

### ✅ Test Suite 5: Security (e2e-security.spec.ts)
- Merchant cannot edit other's product
- Unauthorized access blocked
- Invalid token rejected
- Merchants see only own products
- Customer cannot access merchant APIs

### ✅ Test Suite 6: Complete Flow (e2e-complete-flow.spec.ts)
- Full workflow: Register → Create → Approve → Marketplace

## Viewing Results

```bash
# View HTML report
npm run test:report

# Reports saved in:
# - playwright-report/index.html
# - test-results/results.json
# - Screenshots/videos on failure in test-results/
```

## Troubleshooting

### Test Fails: 401 Unauthorized
**Fix**: Check JWT token generation in auth helper
**Check**: Base URL in playwright.config.ts

### Test Fails: 400 Bad Request (Product Creation)
**Fix**: Ensure merchant has a shop created
**Check**: Shop creation API call in test

### Test Fails: 403 Forbidden (Merchant)
**Fix**: Verify user role is MERCHANT or seller
**Check**: Registration assigns correct role

### Test Fails: 404 Not Found (Product)
**Fix**: Verify product approval status
**Check**: Only approved products are public
