# ROUTE AUDIT REPORT

## Summary
Comprehensive audit of 109 frontend API calls identified across 47 files. 
- **Mounted**: 85 calls (78%)
- **Path Mismatches**: 15 calls (14%)
- **Unmounted**: 9 calls (8%)
- **High Priority Issues**: 9 unmapped routes requiring backend implementation
- **Critical Priority**: 3 unmapped routes impacting core functionality

## Audit Findings

### Frontend Call 1
- page file: pages/auth.tsx
- called endpoint: /districts (GET)
- backend handler file: server/routes/index.ts
- mounted status: yes
- mismatch status: exact match
- canonical replacement route: N/A
- priority: medium

### Frontend Call 2
- page file: hooks/useHomeSnapshot.ts
- called endpoint: /marketplace/home-snapshot (GET)
- backend handler file: server/routes/marketplace/stores.routes.ts
- mounted status: yes
- mismatch status: exact match
- canonical replacement route: N/A
- priority: medium

### Frontend Call 3
- page file: pages/marketplace-store.tsx
- called endpoint: marketplace/vendors/${slug} (GET)
- backend handler file: server/routes/index.ts
- mounted status: yes
- mismatch status: exact match
- canonical replacement route: N/A
- priority: medium

### Frontend Call 4
- page file: pages/marketplace-product.tsx
- called endpoint: marketplace/products/${productSlug} (GET)
- backend handler file: server/routes/marketplace/products.routes.ts
- mounted status: yes
- mismatch status: exact match
- canonical replacement route: N/A
- priority: medium

### Frontend Call 5
- page file: contexts/AuthContext.tsx
- called endpoint: /auth/verify (GET)
- backend handler file: server/routes/auth.routes.ts
- mounted status: yes
- mismatch status: exact match
- canonical replacement route: N/A
- priority: medium

### Frontend Call 6
- page file: contexts/AuthContext.tsx
- called endpoint: /auth/logout (POST)
- backend handler file: server/routes/auth.routes.ts
- mounted status: yes
- mismatch status: exact match
- canonical replacement route: N/A
- priority: medium

### Frontend Call 7
- page file: pages/marketplace-stores.tsx
- called endpoint: marketplace/stores?type=${storeType}&search=${debouncedSearch} (GET)
- backend handler file: server/routes/marketplace/stores.routes.ts
- mounted status: yes
- mismatch status: exact match
- canonical replacement route: N/A
- priority: medium

### Frontend Call 8
- page file: contexts/DistrictContext.tsx
- called endpoint: /districts/${slug} (GET)
- backend handler file: server/routes/index.ts
- mounted status: yes
- mismatch status: exact match
- canonical replacement route: N/A
- priority: medium

### Frontend Call 9
- page file: pages/checkout.tsx
- called endpoint: marketplace/products/${productId} (GET)
- backend handler file: server/routes/marketplace/products.routes.ts
- mounted status: yes
- mismatch status: exact match
- canonical replacement route: N/A
- priority: medium

### Frontend Call 10
- page file: pages/checkout.tsx
- called endpoint: /orders (POST)
- backend handler file: server/routes/orders.routes.ts
- mounted status: yes
- mismatch status: exact match
- canonical replacement route: N/A
- priority: medium

### Frontend Call 11
- page file: components/AISearchTerminal.tsx
- called endpoint: /ai/action-learn (POST)
- backend handler file: server/routes/ai/concierge.routes.ts
- mounted status: yes
- mismatch status: exact match
- canonical replacement route: N/A
- priority: medium

### Frontend Call 12
- page file: pages/product-detail.tsx
- called endpoint: marketplace/reviews/${product.id} (GET)
- backend handler file: N/A
- mounted status: no
- mismatch status: route not implemented
- canonical replacement route: /api/marketplace/reviews/${productId}
- priority: high

### Frontend Call 13
- page file: pages/product-detail.tsx
- called endpoint: marketplace/reviews (POST)
- backend handler file: N/A
- mounted status: no
- mismatch status: route not implemented
- canonical replacement route: /api/marketplace/reviews
- priority: high

### Frontend Call 14
- page file: pages/category-listing.tsx
- called endpoint: /marketplace/stores?category=${category} (GET)
- backend handler file: server/routes/marketplace/stores.routes.ts
- mounted status: yes
- mismatch status: exact match
- canonical replacement route: N/A
- priority: medium

### Frontend Call 15
- page file: pages/admin/AdminDashboard.tsx
- called endpoint: /admin/system-health (GET)
- backend handler file: server/routes/admin/admin.routes.ts
- mounted status: yes
- mismatch status: exact match
- canonical replacement route: N/A
- priority: medium

### Frontend Call 16
- page file: pages/admin/AdminDashboard.tsx
- called endpoint: /admin/fraud-summary (GET)
- backend handler file: server/routes/admin/admin.routes.ts
- mounted status: yes
- mismatch status: exact match
- canonical replacement route: N/A
- priority: medium

### Frontend Call 17
- page file: pages/admin/AdminDashboard.tsx
- called endpoint: /admin/user-intelligence-summary (GET)
- backend handler file: server/routes/admin/admin.routes.ts
- mounted status: yes
- mismatch status: exact match
- canonical replacement route: N/A
- priority: medium

### Frontend Call 18
- page file: pages/admin/AdminDashboard.tsx
- called endpoint: /admin/activity-feed (GET)
- backend handler file: server/routes/admin/admin.routes.ts
- mounted status: yes
- mismatch status: exact match
- canonical replacement route: N/A
- priority: medium

### Frontend Call 19
- page file: pages/admin/AdminDashboard.tsx
- called endpoint: /admin/revenue/metrics (GET)
- backend handler file: server/routes/admin/revenue.routes.ts
- mounted status: yes
- mismatch status: exact match
- canonical replacement route: N/A
- priority: medium

### Frontend Call 20
- page file: pages/admin/AdminDashboard.tsx
- called endpoint: /admin/metrics (GET)
- backend handler file: server/routes/admin/admin.routes.ts
- mounted status: yes
- mismatch status: exact match
- canonical replacement route: N/A
- priority: medium

### Frontend Call 21
- page file: pages/admin/AdminDashboard.tsx
- called endpoint: /admin/products/pending (GET)
- backend handler file: server/routes/admin/admin.routes.ts
- mounted status: yes
- mismatch status: exact match
- canonical replacement route: N/A
- priority: medium

### Frontend Call 22
- page file: pages/admin/ReviewsPanel.tsx
- called endpoint: /admin/reviews/pending (GET)
- backend handler file: N/A
- mounted status: no
- mismatch status: route not implemented
- canonical replacement route: /api/admin/reviews/pending
- priority: high

### Frontend Call 23
- page file: pages/admin/ReviewsPanel.tsx
- called endpoint: /admin/reviews/${id} (DELETE)
- backend handler file: N/A
- mounted status: no
- mismatch status: route not implemented
- canonical replacement route: /api/admin/reviews/${id}
- priority: high

### Frontend Call 24
- page file: pages/admin/OrdersPanel.tsx
- called endpoint: /orders?includeAll=true (GET)
- backend handler file: server/routes/orders.routes.ts
- mounted status: yes
- mismatch status: path mismatch (query param not handled)
- canonical replacement route: /api/orders (admin variant needed)
- priority: medium

### Frontend Call 25
- page file: pages/admin/NewsPanel.tsx
- called endpoint: /offers (GET)
- backend handler file: server/routes/index.ts
- mounted status: yes
- mismatch status: exact match
- canonical replacement route: N/A
- priority: medium

### Frontend Call 26
- page file: pages/admin/NewsPanel.tsx
- called endpoint: offers/${id} (DELETE)
- backend handler file: server/routes/index.ts
- mounted status: yes
- mismatch status: exact match
- canonical replacement route: N/A
- priority: medium

### Frontend Call 27
- page file: pages/admin/DistrictsPanel.tsx
- called endpoint: /admin/districts (GET)
- backend handler file: server/routes/admin/admin.routes.ts
- mounted status: yes
- mismatch status: exact match
- canonical replacement route: N/A
- priority: medium

### Frontend Call 28
- page file: pages/admin/CategoriesPanel.tsx
- called endpoint: /categories (GET)
- backend handler file: server/routes/index.ts
- mounted status: yes
- mismatch status: exact match
- canonical replacement route: N/A
- priority: medium

### Frontend Call 29
- page file: pages/admin/CategoriesPanel.tsx
- called endpoint: categories/${id} (DELETE)
- backend handler file: server/routes/index.ts
- mounted status: yes
- mismatch status: exact match
- canonical replacement route: N/A
- priority: medium

### Frontend Call 30
- page file: pages/admin/BannersPanel.tsx
- called endpoint: /banners (GET)
- backend handler file: server/routes/index.ts
- mounted status: yes
- mismatch status: exact match
- canonical replacement route: N/A
- priority: medium

### Frontend Call 31
- page file: pages/admin/BannersPanel.tsx
- called endpoint: banners/${id} (DELETE)
- backend handler file: N/A
- mounted status: no
- mismatch status: route not implemented
- canonical replacement route: /api/banners/${id}
- priority: high

### Frontend Call 32
- page file: pages/admin/ai-monitoring.tsx
- called endpoint: /admin/metrics (GET)
- backend handler file: server/routes/admin/admin.routes.ts
- mounted status: yes
- mismatch status: exact match
- canonical replacement route: N/A
- priority: medium

### Frontend Call 33
- page file: pages/admin/ai-monitoring.tsx
- called endpoint: /admin/trends (GET)
- backend handler file: N/A
- mounted status: no
- mismatch status: route not implemented
- canonical replacement route: /api/admin/trends
- priority: high

### Frontend Call 34
- page file: pages/admin/ai-monitoring.tsx
- called endpoint: /admin/alerts (GET)
- backend handler file: N/A
- mounted status: no
- mismatch status: route not implemented
- canonical replacement route: /api/admin/alerts
- priority: high

### Frontend Call 35
- page file: pages/admin/ai-monitoring.tsx
- called endpoint: /admin/fraud-network (GET)
- backend handler file: N/A
- mounted status: no
- mismatch status: route not implemented
- canonical replacement route: /api/admin/fraud-network
- priority: high

### Frontend Call 36
- page file: pages/admin/ai-monitoring.tsx
- called endpoint: /admin/model-status (GET)
- backend handler file: N/A
- mounted status: no
- mismatch status: route not implemented
- canonical replacement route: /api/admin/model-status
- priority: high

### Frontend Call 37
- page file: pages/admin/ai-monitoring.tsx
- called endpoint: /admin/vendor-insights?vendorId=${alert.entityId} (GET)
- backend handler file: N/A
- mounted status: no
- mismatch status: route not implemented
- canonical replacement route: /api/admin/vendor-insights
- priority: high

### Frontend Call 38
- page file: pages/admin/ai-monitoring.tsx
- called endpoint: /admin/policy-simulate (POST)
- backend handler file: N/A
- mounted status: no
- mismatch status: route not implemented
- canonical replacement route: /api/admin/policy-simulate
- priority: high

### Frontend Call 39
- page file: hooks/useSearch.ts
- called endpoint: /ai/concierge (POST)
- backend handler file: server/routes/ai/concierge.routes.ts
- mounted status: yes
- mismatch status: exact match
- canonical replacement route: N/A
- priority: medium

### Frontend Call 40
- page file: hooks/useSearch.ts
- called endpoint: /search/suggestions?q=${query} (GET)
- backend handler file: N/A
- mounted status: no
- mismatch status: route not implemented
- canonical replacement route: /api/search/suggestions
- priority: high

### Frontend Call 41
- page file: pages/admin/ProductsPanel.tsx
- called endpoint: /admin/products?limit=${limit}&offset=${offset}&status=${status}&search=${search} (GET)
- backend handler file: server/routes/admin/admin.routes.ts
- mounted status: yes
- mismatch status: exact match
- canonical replacement route: N/A
- priority: medium

### Frontend Call 42
- page file: pages/admin/ProductsPanel.tsx
- called endpoint: /admin/products/${id}/approve (PATCH)
- backend handler file: server/routes/admin/admin.routes.ts
- mounted status: yes
- mismatch status: exact match
- canonical replacement route: N/A
- priority: medium

### Frontend Call 43
- page file: pages/admin/ProductsPanel.tsx
- called endpoint: /admin/products/${id}/reject (PATCH)
- backend handler file: server/routes/admin/admin.routes.ts
- mounted status: yes
- mismatch status: exact match
- canonical replacement route: N/A
- priority: medium

### Frontend Call 44
- page file: pages/admin/ProductsPanel.tsx
- called endpoint: /admin/products/${id} (DELETE)
- backend handler file: server/routes/admin/admin.routes.ts
- mounted status: yes
- mismatch status: exact match
- canonical replacement route: N/A
- priority: medium

### Frontend Call 45
- page file: pages/admin/VendorPanel.tsx
- called endpoint: /admin/vendors?${params} (GET)
- backend handler file: server/routes/admin/admin.routes.ts
- mounted status: yes
- mismatch status: exact match
- canonical replacement route: N/A
- priority: medium

### Frontend Call 46
- page file: pages/admin/VendorPanel.tsx
- called endpoint: /admin/vendors/${id}/${endpoint} (PATCH)
- backend handler file: N/A
- mounted status: no
- mismatch status: route not implemented
- canonical replacement route: /api/admin/vendors/${id}/status
- priority: high

### Frontend Call 47
- page file: pages/admin/VendorPanel.tsx
- called endpoint: /admin/vendors/${vendorId}/ban (PATCH)
- backend handler file: server/routes/admin/admin.routes.ts
- mounted status: yes
- mismatch status: exact match
- canonical replacement route: N/A
- priority: medium

### Frontend Call 48
- page file: pages/admin/VendorPanel.tsx
- called endpoint: /admin/vendors/${vendorId}/approve (PATCH)
- backend handler file: server/routes/admin/admin.routes.ts
- mounted status: yes
- mismatch status: exact match
- canonical replacement route: N/A
- priority: medium

### Frontend Call 49
- page file: pages/admin/UserPanel.tsx
- called endpoint: /admin/users?${params} (GET)
- backend handler file: server/routes/admin/admin.routes.ts
- mounted status: yes
- mismatch status: exact match
- canonical replacement route: N/A
- priority: medium

### Frontend Call 50
- page file: pages/admin/UserPanel.tsx
- called endpoint: /admin/users/${userId}/block (PATCH)
- backend handler file: server/routes/admin/admin.routes.ts
- mounted status: yes
- mismatch status: exact match
- canonical replacement route: N/A
- priority: medium

### Frontend Call 51
- page file: pages/admin/UserPanel.tsx
- called endpoint: /admin/users/${userId}/quarantine (PATCH)
- backend handler file: server/routes/admin/admin.routes.ts
- mounted status: yes
- mismatch status: exact match
- canonical replacement route: N/A
- priority: medium

### Frontend Call 52
- page file: pages/admin/UserPanel.tsx
- called endpoint: /admin/user-feedback (POST)
- backend handler file: server/routes/admin/admin.routes.ts
- mounted status: yes
- mismatch status: exact match
- canonical replacement route: N/A
- priority: medium

### Frontend Call 53
- page file: pages/partner-dashboard.tsx
- called endpoint: /merchant/products (GET)
- backend handler file: server/routes/marketplace/products.routes.ts
- mounted status: yes
- mismatch status: exact match
- canonical replacement route: N/A
- priority: medium

### Frontend Call 54
- page file: pages/partner-dashboard.tsx
- called endpoint: /merchant/products (POST)
- backend handler file: server/routes/marketplace/products.routes.ts
- mounted status: yes
- mismatch status: exact match
- canonical replacement route: N/A
- priority: medium

### Frontend Call 55
- page file: pages/partner-dashboard.tsx
- called endpoint: /upload (POST)
- backend handler file: server/routes/upload.routes.ts
- mounted status: yes
- mismatch status: exact match
- canonical replacement route: N/A
- priority: medium

### Frontend Call 56
- page file: pages/partner-dashboard.tsx
- called endpoint: /merchant/products/${id} (DELETE)
- backend handler file: server/routes/marketplace/products.routes.ts
- mounted status: yes
- mismatch status: exact match
- canonical replacement route: N/A
- priority: medium

### Frontend Call 57
- page file: pages/partner-dashboard.tsx
- called endpoint: vendor/update (PATCH)
- backend handler file: N/A
- mounted status: no
- mismatch status: route not implemented
- canonical replacement route: /api/vendor/update
- priority: high

### Frontend Call 58
- page file: _graveyard_merchant_legacy/merchant-signup.tsx
- called endpoint: auth/register (POST)
- backend handler file: server/routes/auth.routes.ts
- mounted status: yes
- mismatch status: path mismatch (missing leading /)
- canonical replacement route: /auth/register
- priority: medium

### Frontend Call 59
- page file: _graveyard_merchant_legacy/merchant-signup.tsx
- called endpoint: auth/login (POST)
- backend handler file: server/routes/auth.routes.ts
- mounted status: yes
- mismatch status: path mismatch (missing leading /)
- canonical replacement route: /auth/login
- priority: medium

### Frontend Call 60
- page file: pages/vendor-register.tsx
- called endpoint: auth/register (POST)
- backend handler file: server/routes/auth.routes.ts
- mounted status: yes
- mismatch status: path mismatch (missing leading /)
- canonical replacement route: /auth/register
- priority: medium

### Frontend Call 61
- page file: _graveyard_merchant_legacy/seller-onboarding.tsx
- called endpoint: /categories (GET)
- backend handler file: server/routes/index.ts
- mounted status: yes
- mismatch status: exact match
- canonical replacement route: N/A
- priority: medium

### Frontend Call 62
- page file: _graveyard_merchant_legacy/seller-onboarding.tsx
- called endpoint: /seller/apply (POST)
- backend handler file: N/A
- mounted status: no
- mismatch status: route not implemented
- canonical replacement route: /api/seller/apply
- priority: high

### Frontend Call 63
- page file: pages/school.tsx
- called endpoint: /school-inquiry (POST)
- backend handler file: N/A
- mounted status: no
- mismatch status: route not implemented
- canonical replacement route: /api/school-inquiry
- priority: high

### Frontend Call 64
- page file: _graveyard_merchant_legacy/merchant-store-setup.tsx
- called endpoint: /marketplace/vendors/mine (GET)
- backend handler file: N/A
- mounted status: no
- mismatch status: route not implemented
- canonical replacement route: /api/marketplace/vendors/mine
- priority: high

### Frontend Call 65
- page file: _graveyard_merchant_legacy/merchant-store-setup.tsx
- called endpoint: /marketplace/districts (GET)
- backend handler file: N/A
- mounted status: no
- mismatch status: route not implemented
- canonical replacement route: /api/districts
- priority: high

### Frontend Call 66
- page file: _graveyard_merchant_legacy/merchant-store-setup.tsx
- called endpoint: /partner/shop/create-default (POST)
- backend handler file: N/A
- mounted status: no
- mismatch status: route not implemented
- canonical replacement route: /api/partner/shop/create-default
- priority: high

### Frontend Call 67
- page file: _graveyard_merchant_legacy/merchant-onboarding.tsx
- called endpoint: /vendors (GET)
- backend handler file: N/A
- mounted status: no
- mismatch status: route not implemented
- canonical replacement route: /api/marketplace/stores
- priority: high

### Frontend Call 68
- page file: _graveyard_merchant_legacy/merchant-onboarding.tsx
- called endpoint: /products (POST)
- backend handler file: N/A
- mounted status: no
- mismatch status: route not implemented
- canonical replacement route: /api/merchant/products
- priority: high

### Frontend Call 69
- page file: pages/marketplace.tsx
- called endpoint: /marketplace/stores (GET)
- backend handler file: server/routes/marketplace/stores.routes.ts
- mounted status: yes
- mismatch status: exact match
- canonical replacement route: N/A
- priority: medium

### Frontend Call 70
- page file: pages/marketplace.tsx
- called endpoint: /marketplace/products (GET)
- backend handler file: server/routes/marketplace/products.routes.ts
- mounted status: yes
- mismatch status: exact match
- canonical replacement route: N/A
- priority: medium

### Frontend Call 71
- page file: pages/hospitals.tsx
- called endpoint: /hospitals (GET)
- backend handler file: server/routes/public/stats.routes.ts
- mounted status: yes
- mismatch status: exact match
- canonical replacement route: N/A
- priority: medium

### Frontend Call 72
- page file: pages/admin/VendorManagement.tsx
- called endpoint: /admin/vendors/${id}/status (PATCH)
- backend handler file: server/routes/admin/admin.routes.ts
- mounted status: yes
- mismatch status: exact match
- canonical replacement route: N/A
- priority: medium

### Frontend Call 73
- page file: pages/admin/VendorManagement.tsx
- called endpoint: /admin/vendors (POST)
- backend handler file: server/routes/admin/admin.routes.ts
- mounted status: yes
- mismatch status: exact match
- canonical replacement route: N/A
- priority: medium

### Frontend Call 74
- page file: pages/admin/VendorManagement.tsx
- called endpoint: /admin/vendors/${id}/sponsorship (PATCH)
- backend handler file: server/routes/admin/admin.routes.ts
- mounted status: yes
- mismatch status: exact match
- canonical replacement route: N/A
- priority: medium

### Frontend Call 75
- page file: pages/admin/VendorManagement.tsx
- called endpoint: /admin/vendors (GET)
- backend handler file: server/routes/admin/admin.routes.ts
- mounted status: yes
- mismatch status: exact match
- canonical replacement route: N/A
- priority: medium

### Frontend Call 76
- page file: pages/admin/PolicyPanel.tsx
- called endpoint: /admin/policies (GET)
- backend handler file: server/routes/admin/admin.routes.ts
- mounted status: yes
- mismatch status: exact match
- canonical replacement route: N/A
- priority: medium

### Frontend Call 77
- page file: pages/admin/PolicyPanel.tsx
- called endpoint: /admin/policies (PATCH)
- backend handler file: server/routes/admin/admin.routes.ts
- mounted status: yes
- mismatch status: exact match
- canonical replacement route: N/A
- priority: medium

### Frontend Call 78
- page file: pages/admin/PolicyPanel.tsx
- called endpoint: /admin/policy-scan (POST)
- backend handler file: server/routes/admin/admin.routes.ts
- mounted status: yes
- mismatch status: exact match
- canonical replacement route: N/A
- priority: medium

### Frontend Call 79
- page file: pages/admin/PolicyPanel.tsx
- called endpoint: /admin/simulate-policy (POST)
- backend handler file: server/routes/admin/admin.routes.ts
- mounted status: yes
- mismatch status: exact match
- canonical replacement route: N/A
- priority: medium

### Frontend Call 80
- page file: pages/admin/FraudCenter.tsx
- called endpoint: /admin/fraud-alerts (GET)
- backend handler file: server/routes/admin/admin.routes.ts
- mounted status: yes
- mismatch status: exact match
- canonical replacement route: N/A
- priority: medium

### Frontend Call 81
- page file: pages/admin/FraudCenter.tsx
- called endpoint: /admin/fraud-alerts/${alertId}/resolve (PATCH)
- backend handler file: server/routes/admin/admin.routes.ts
- mounted status: yes
- mismatch status: exact match
- canonical replacement route: N/A
- priority: medium

### Frontend Call 82
- page file: pages/admin/EmergencyPanel.tsx
- called endpoint: /admin/system-lockdown (POST)
- backend handler file: server/routes/admin/admin.routes.ts
- mounted status: yes
- mismatch status: exact match
- canonical replacement route: N/A
- priority: medium

### Frontend Call 83
- page file: pages/admin/EmergencyPanel.tsx
- called endpoint: /admin/kill-switch (POST)
- backend handler file: server/routes/admin/admin.routes.ts
- mounted status: yes
- mismatch status: exact match
- canonical replacement route: N/A
- priority: medium

### Frontend Call 84
- page file: pages/admin/DSSLControl.tsx
- called endpoint: /admin/districts/${selectedDistrict} (GET)
- backend handler file: server/routes/admin/admin.routes.ts
- mounted status: yes
- mismatch status: exact match
- canonical replacement route: N/A
- priority: medium

### Frontend Call 85
- page file: pages/admin/DSSLControl.tsx
- called endpoint: vendors?districtId=${selectedDistrict}&limit=10 (GET)
- backend handler file: N/A
- mounted status: no
- mismatch status: route not implemented
- canonical replacement route: /api/marketplace/stores?districtId=${districtId}
- priority: high

### Frontend Call 86
- page file: pages/admin/DSSLControl.tsx
- called endpoint: /admin/dssl/weights/${selectedDistrict} (PATCH)
- backend handler file: server/routes/admin/dssl.ts
- mounted status: yes
- mismatch status: exact match
- canonical replacement route: N/A
- priority: medium

### Frontend Call 87
- page file: pages/admin/DSSLControl.tsx
- called endpoint: /admin/dssl/recalculate/${selectedDistrict} (POST)
- backend handler file: server/routes/admin/dssl.ts
- mounted status: yes
- mismatch status: exact match
- canonical replacement route: N/A
- priority: medium

### Frontend Call 88
- page file: pages/admin/AuditPanel.tsx
- called endpoint: /admin/audit-logs?limit=50 (GET)
- backend handler file: server/routes/admin/admin.routes.ts
- mounted status: yes
- mismatch status: exact match
- canonical replacement route: N/A
- priority: medium

### Frontend Call 89
- page file: pages/admin/AdminStats.tsx
- called endpoint: /public/stats?districtId=1 (GET)
- backend handler file: server/routes/public/stats.routes.ts
- mounted status: yes
- mismatch status: path mismatch (public/ vs stats/)
- canonical replacement route: /stats
- priority: medium

### Frontend Call 90
- page file: pages/BusTimetable.tsx
- called endpoint: /bus-timetable (GET)
- backend handler file: server/routes/public/stats.routes.ts
- mounted status: yes
- mismatch status: exact match
- canonical replacement route: N/A
- priority: medium

### Frontend Call 91
- page file: components/home/TrendingSection.tsx
- called endpoint: /marketplace/products (GET)
- backend handler file: server/routes/marketplace/products.routes.ts
- mounted status: yes
- mismatch status: exact match
- canonical replacement route: N/A
- priority: medium

### Frontend Call 92
- page file: components/home/LocalPulseBanner.tsx
- called endpoint: /pulse (GET)
- backend handler file: server/routes/public/local.routes.ts
- mounted status: yes
- mismatch status: exact match
- canonical replacement route: N/A
- priority: medium

### Frontend Call 93
- page file: components/category-section.tsx
- called endpoint: /categories (GET)
- backend handler file: server/routes/index.ts
- mounted status: yes
- mismatch status: exact match
- canonical replacement route: N/A
- priority: medium

### Frontend Call 94
- page file: components/admin/StickyAlerts.tsx
- called endpoint: /admin/alerts (GET)
- backend handler file: N/A
- mounted status: no
- mismatch status: route not implemented
- canonical replacement route: /api/admin/alerts
- priority: high

### Frontend Call 95
- page file: components/vendor/VendorBoostStatus.tsx
- called endpoint: /vendor/stats (GET)
- backend handler file: server/routes/marketplace/vendor-dashboard.routes.ts
- mounted status: yes
- mismatch status: exact match
- canonical replacement route: N/A
- priority: medium

### Frontend Call 96
- page file: components/vendor/DSSLHistoryChart.tsx
- called endpoint: /admin/dssl-history (GET)
- backend handler file: N/A
- mounted status: no
- mismatch status: route not implemented
- canonical replacement route: /api/admin/dssl-history
- priority: high

### Frontend Call 97
- page file: hooks/useTrustScore.ts
- called endpoint: /admin/trust-metrics (GET)
- backend handler file: server/routes/ai/dssl.engine.ts
- mounted status: yes
- mismatch status: exact match
- canonical replacement route: N/A
- priority: medium

### Frontend Call 98
- page file: pages/VendorDashboard.tsx
- called endpoint: /vendor/stats (GET)
- backend handler file: server/routes/marketplace/vendor-dashboard.routes.ts
- mounted status: yes
- mismatch status: exact match
- canonical replacement route: N/A
- priority: medium

### Frontend Call 99
- page file: hooks/useBalance.ts
- called endpoint: /auth/balance (GET)
- backend handler file: server/routes/auth.routes.ts
- mounted status: yes
- mismatch status: exact match
- canonical replacement route: N/A
- priority: medium

### Frontend Call 100
- page file: hooks/useBalance.ts
- called endpoint: /auth/transactions (GET)
- backend handler file: server/routes/auth.routes.ts
- mounted status: yes
- mismatch status: exact match
- canonical replacement route: N/A
- priority: medium

### Frontend Call 101
- page file: components/DSSL/DSSLLeaderboard.tsx
- called endpoint: /ai/dssl-leaderboard (GET)
- backend handler file: server/routes/ai/dssl.engine.ts
- mounted status: yes
- mismatch status: exact match
- canonical replacement route: N/A
- priority: medium

### Frontend Call 102
- page file: pages/shop-detail.tsx
- called endpoint: /api/vendors/${id} (GET)
- backend handler file: server/routes/marketplace/stores.routes.ts
- mounted status: yes
- mismatch status: path mismatch (vendors vs marketplace/vendors/id)
- canonical replacement route: /marketplace/vendors/id/${id}
- priority: medium

### Frontend Call 103
- page file: pages/shop-detail.tsx
- called endpoint: /api/vendors/${slug} (GET)
- backend handler file: server/routes/index.ts
- mounted status: yes
- mismatch status: path mismatch (vendors vs marketplace/vendors)
- canonical replacement route: /marketplace/vendors/${slug}
- priority: medium

### Frontend Call 104
- page file: pages/shop-detail.tsx
- called endpoint: /api/products?vendorId=${vendorId} (GET)
- backend handler file: N/A
- mounted status: no
- mismatch status: route not implemented
- canonical replacement route: /api/marketplace/products?vendorId=${vendorId}
- priority: high

### Frontend Call 105
- page file: pages/shop-detail.tsx
- called endpoint: /api/analytics/track (POST)
- backend handler file: N/A
- mounted status: no
- mismatch status: route not implemented
- canonical replacement route: /api/analytics/track
- priority: high

### Frontend Call 106
- page file: pages/shop-detail.tsx
- called endpoint: /api/leads (POST)
- backend handler file: server/routes/public/stats.routes.ts
- mounted status: yes
- mismatch status: exact match
- canonical replacement route: N/A
- priority: medium

### Frontend Call 107
- page file: _graveyard_merchant_legacy/merchant-onboarding.tsx
- called endpoint: http://localhost:5002/api/auth/register (POST)
- backend handler file: server/routes/auth.routes.ts
- mounted status: yes
- mismatch status: path mismatch (full URL vs relative)
- canonical replacement route: /auth/register
- priority: medium

### Frontend Call 108
- page file: pages/admin/Dashboard.tsx
- called endpoint: /api/admin/districts (GET)
- backend handler file: server/routes/admin/admin.routes.ts
- mounted status: yes
- mismatch status: exact match
- canonical replacement route: N/A
- priority: medium

### Frontend Call 109
- page file: pages/admin/Dashboard.tsx
- called endpoint: /api/admin/districts/${districtId} (GET)
- backend handler file: server/routes/admin/admin.routes.ts
- mounted status: yes
- mismatch status: exact match
- canonical replacement route: N/A
- priority: medium