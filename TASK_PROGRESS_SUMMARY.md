# Sovereign Flow Automation Suite — Progress

## ✅ COMPLETED

### 1. tests/helpers/auth.helper.ts
Reusable auth helpers:
- `loginAsAdmin(page)` — REAL UI login via /admin/login using seeded credentials
- `loginAsUser(page, username, password)` — API login with localStorage sync
- `logout(page)` — UI logout with API fallback
- `waitForSovereignHydration(page)` — district hydration verification

### 2. tests/e2e-auth-session.spec.ts
7 test cases covering:
- TC-AUTH-1: Login with seeded admin credentials
- TC-AUTH-2: Refresh token persists after page reload
- TC-AUTH-3: Auth survives full reload with district context
- TC-AUTH-4: API requests include district context
- TC-AUTH-5: Logout clears session
- TC-AUTH-6: No auth flicker across navigation
- TC-AUTH-7: No 401 storms on parallel API calls

### 3. tests/e2e-booking-flow.spec.ts
6 test cases covering:
- TC-BOOK-1: Open vendor detail with district routing (/shahdol/partner/sanjivanidoctor)
- TC-BOOK-2: Book Appointment button visible
- TC-BOOK-3: Booking modal opens and form fillable
- TC-BOOK-4: Submit booking and verify POST /api/appointments success
- TC-BOOK-5: Mobile viewport (390x844) works
- TC-BOOK-6: Dark sovereign theme persists

### 4. tests/e2e-admin-moderation.spec.ts
6 test cases covering:
- TC-MOD-1: Admin views pending vendors
- TC-MOD-2: Admin approves pending vendor
- TC-MOD-3: Approved vendor propagates to marketplace visibility
- TC-MOD-4: Approved vendor products visible publicly
- TC-MOD-5: No stale pending state after approval
- TC-MOD-6: District isolation preserved

## ⏳ REMAINING

### 5. tests/e2e-checkout-cod.spec.ts — NOT YET CREATED
Need to explore:
- Cart page structure
- Checkout page UI elements
- Order creation API endpoints
- COD selection flow

## 🔍 EXPLORATION NEEDED FOR CHECKOUT SUITE
Need to find:
- Cart page URL pattern (/cart, /shahdol/cart?)
- Add to cart API: POST /api/cart
- Checkout page elements: "Proceed to Checkout" button
- COD selection: radio button or payment method selector
- Order placement: "Place Order" button
- Order success: success page or toast
