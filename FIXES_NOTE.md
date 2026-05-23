// FIX 1 — Vendor generic status update (line ~267) - data:{ status } → synchronized
// FIX 2 — Vendor approve (line ~344) - data: { status: "APPROVED" } → with isShadowBanned: false
// FIX 3 — Vendor ban (line ~293) - data: { status: "BANNED" } → with isShadowBanned: true  
// FIX 4 — Product approve (line ~445) - data: { status: "APPROVED" } → { status: "approved", approved: true }
// FIX 5 — Product reject (line ~502) - data: { status: "REJECTED" } → { status: "rejected", approved: false }
// FIX 6 — Fraud resolve (line ~638) - districtId: 0 → districtId: req.ctx?.districtId || 0

// These are written as direct replacements to admin.routes.ts at exact line anchors.
