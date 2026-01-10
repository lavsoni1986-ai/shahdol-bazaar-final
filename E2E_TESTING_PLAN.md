# 🧪 End-to-End Testing Plan - Shahdol Bazaar MVP

## Overview
This document outlines the comprehensive E2E testing strategy for Shahdol Bazaar MVP using Playwright.

---

## 🎯 Test Scenarios

### 1. User Registration & Login
**Test Case 1.1: Customer Registration**
- Register a new customer account
- Verify user can log in with credentials
- Verify role is set to CUSTOMER

**Test Case 1.2: Merchant Registration**
- Register a new merchant account
- Verify user can log in with credentials
- Verify role is set to MERCHANT

**Test Case 1.3: Login Flow**
- Test login with valid credentials
- Verify JWT token is received
- Verify token is stored in localStorage
- Test redirect based on role

---

### 2. Merchant Product Upload
**Test Case 2.1: Create Product (Sanjivani Clinic)**
- Login as merchant
- Navigate to `/partner/products`
- Fill product form:
  - Title: "Sanjivani Clinic"
  - Price: "500"
  - MRP: "600"
  - Category: "Healthcare"
  - Description: "Best clinic in Shahdol"
  - Stock: 10
- Upload product images (1-5 images)
- Submit form
- Verify product is created with status "pending"
- Verify images are uploaded successfully

**Test Case 2.2: View Merchant Products**
- List all merchant's products
- Verify only merchant's own products are visible
- Verify product status badges

---

### 3. Admin Approval Workflow
**Test Case 3.1: View Pending Products**
- Login as SUPER_ADMIN
- Navigate to admin panel or call API directly
- Verify pending products are visible
- Verify product details (title, merchant, images)

**Test Case 3.2: Approve Product**
- Select a pending product
- Approve the product
- Verify status changes to "approved"
- Verify `approved` field is set to `true`

**Test Case 3.3: Reject Product**
- Select a pending product
- Reject the product with reason
- Verify status changes to "rejected"
- Verify product is not visible on marketplace

---

### 4. Marketplace Visibility
**Test Case 4.1: Approved Products Only**
- Visit homepage as anonymous user
- Verify only approved products are visible
- Verify pending products are NOT visible
- Verify rejected products are NOT visible

**Test Case 4.2: Product Details**
- Click on approved product
- Verify product details page loads
- Verify all product information is correct
- Verify images are displayed

---

### 5. JWT & Security
**Test Case 5.1: Merchant Cannot Edit Other's Product**
- Login as Merchant A
- Create a product
- Get product ID
- Logout
- Login as Merchant B
- Attempt to update Merchant A's product
- Verify 403 Forbidden error
- Verify product is not updated

**Test Case 5.2: Unauthorized Access**
- Attempt to access `/api/merchant/products` without token
- Verify 401 Unauthorized error

**Test Case 5.3: Token Validation**
- Use expired/invalid token
- Verify 401 Unauthorized error
- Verify refresh token flow works

---

## 📋 API Endpoints to Test

### Authentication
- `POST /api/register` - User registration
- `POST /api/login` - User login (returns JWT)
- `POST /api/auth/refresh` - Refresh access token
- `POST /api/auth/logout` - Logout

### Merchant APIs (JWT Required)
- `GET /api/merchant/products` - List merchant products
- `POST /api/merchant/products` - Create product
- `PUT /api/merchant/products/:id` - Update product
- `DELETE /api/merchant/products/:id` - Delete product
- `PATCH /api/merchant/products/:id/stock` - Update stock

### Admin APIs (SUPER_ADMIN Required)
- `GET /api/admin/products/pending` - List pending products
- `PATCH /api/admin/products/:id/approve` - Approve product
- `PATCH /api/admin/products/:id/reject` - Reject product

### Public APIs
- `GET /api/products` - List approved products (public)
- `GET /api/products/:id` - Get product details

---

## 🔧 Test Data Setup

### Test Users
1. **Customer User**
   - Username: `testcustomer_e2e`
   - Password: `Test123456`
   - Role: CUSTOMER

2. **Merchant User (Sanjivani Clinic)**
   - Username: `sanjivaniclinic_e2e`
   - Password: `Sanjivani123`
   - Role: MERCHANT

3. **Admin User**
   - Username: `admin` (existing)
   - Password: `shahdol123`
   - Role: SUPER_ADMIN

### Test Product
- **Title**: "Sanjivani Clinic - Healthcare Services"
- **Price**: "500"
- **MRP**: "600"
- **Category**: "Healthcare"
- **Description**: "Best healthcare services in Shahdol"
- **Stock**: 10
- **Images**: 2 test images

---

## ✅ Acceptance Criteria

1. ✅ Users can register and login successfully
2. ✅ Merchants can create products with images
3. ✅ Products default to "pending" status
4. ✅ Admin can view pending products
5. ✅ Admin can approve/reject products
6. ✅ Only approved products appear on homepage
7. ✅ Merchants can only edit their own products
8. ✅ JWT authentication works correctly
9. ✅ Security checks prevent unauthorized access

---

## 🚀 Running Tests

```bash
# Run all E2E tests
npm run test

# Run tests in headed mode (see browser)
npm run test:headed

# Run specific test file
npx playwright test tests/e2e-auth.spec.ts

# Run tests with UI mode
npm run test:ui

# Generate test report
npm run test:report
```

---

## 📊 Test Reports

After running tests, view the HTML report:
```bash
npm run test:report
```

Reports are saved in:
- HTML: `playwright-report/index.html`
- JSON: `test-results/results.json`
- Screenshots: `test-results/` (on failure)
- Videos: `test-results/` (on failure)

---

## 🐛 Expected Issues & Fixes

### Issue 1: Token Expiration
**Symptom**: Tests fail with 401 errors
**Fix**: Implement token refresh in test helpers

### Issue 2: Product Not Appearing
**Symptom**: Product created but not visible
**Fix**: Verify approval status, check filters

### Issue 3: Image Upload Fails
**Symptom**: Product created without images
**Fix**: Check Cloudinary credentials, file size limits

### Issue 4: Race Conditions
**Symptom**: Tests fail intermittently
**Fix**: Add proper waits and assertions

---

## 📝 Notes

- All tests use JWT authentication
- Tests clean up after themselves (delete test data)
- Tests run in parallel for speed
- Screenshots/videos captured on failure
- Tests are idempotent (can run multiple times)
