# 🧪 End-to-End Testing - Quick Start Guide

## Running Tests

### Run All Tests
```bash
npm run test
```

### Run in Headed Mode (See Browser)
```bash
npm run test:headed
```

### Run Specific Test File
```bash
npx playwright test tests/e2e-complete-flow.spec.ts
```

### Run in UI Mode (Interactive)
```bash
npm run test:ui
```

### View Test Report
```bash
npm run test:report
```

## Test Files

1. **`e2e-auth.spec.ts`** - User Registration & Login
2. **`e2e-product-upload.spec.ts`** - Merchant Product Upload
3. **`e2e-admin-approval.spec.ts`** - Admin Approval Workflow
4. **`e2e-marketplace-visibility.spec.ts`** - Marketplace Visibility
5. **`e2e-security.spec.ts`** - JWT & Security Tests
6. **`e2e-complete-flow.spec.ts`** - Complete End-to-End Flow

## Important Notes

1. **Base URL**: Tests run against the URL in `playwright.config.ts`
2. **Test Data**: Tests create temporary users/products and clean up after
3. **Admin User**: Tests assume admin user exists (username: `admin`, password: `shahdol123`)
4. **Shop Requirement**: Merchants need a shop before creating products

## Troubleshooting

### Tests Fail with 401
- Check if JWT tokens are being generated correctly
- Verify base URL in `playwright.config.ts`
- Check if server is running

### Product Creation Fails
- Verify merchant has a shop (`/api/partner/shop/create-default`)
- Check Cloudinary credentials for image upload
- Verify all required fields are provided

### Admin Approval Fails
- Verify admin user exists and can login
- Check if product exists and is pending
- Verify SUPER_ADMIN role assignment
