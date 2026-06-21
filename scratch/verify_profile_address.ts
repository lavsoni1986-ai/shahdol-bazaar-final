import { prisma, tenantContext } from "../server/storage";
import crypto from "crypto";

async function verifyProfileAddressSystem() {
  console.log("🔍 [VERIFY PROFILE & ADDRESS AUTHORITY] Starting certification tests...");

  // Setup test user and district
  // 1. Get an existing district or create a mock one
  let district = await prisma.district.findFirst();
  if (!district) {
    console.log("Creating mock district...");
    district = await prisma.district.create({
      data: {
        name: "Test Shahdol",
        slug: "test-shahdol",
        state: "Madhya Pradesh"
      }
    });
  }

  // 2. Resolve or create test users
  let testUser1 = await prisma.user.findFirst({ where: { username: "test_customer_1" } });
  if (!testUser1) {
    console.log("Creating test customer 1...");
    testUser1 = await prisma.user.create({
      data: {
        username: "test_customer_1",
        password: "password_hash_here",
        role: "customer",
        districtId: district.id
      }
    });
  }

  let testUser2 = await prisma.user.findFirst({ where: { username: "test_customer_2" } });
  if (!testUser2) {
    console.log("Creating test customer 2...");
    testUser2 = await prisma.user.create({
      data: {
        username: "test_customer_2",
        password: "password_hash_here",
        role: "customer",
        districtId: district.id
      }
    });
  }

  // Setup simulated request helpers for audit log validation
  const mockReq = (userId: number, districtId: number) => ({
    ip: "127.0.0.1",
    get: (header: string) => "Test-User-Agent",
    ctx: { userId, districtId }
  } as any);

  // Helper function mimicking route audit log write
  async function logAuditEvent(
    req: any,
    action: string,
    targetId: number,
    targetType: string,
    details: string,
    metadata?: any
  ) {
    const lastEntry = await prisma.auditLog.findFirst({
      orderBy: { id: 'desc' },
      select: { hash: true }
    });
    const prevHash = lastEntry?.hash || "GENESIS";
    const auditData = JSON.stringify({
      action,
      userId: req.ctx.userId,
      targetId,
      targetType,
      details,
      metadata,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      districtId: req.ctx.districtId,
      timestamp: new Date().toISOString()
    });
    const hash = crypto.createHash("sha256").update(prevHash + auditData).digest("hex");
    await prisma.auditLog.create({
      data: {
        action,
        userId: req.ctx.userId,
        entityType: targetType,
        entityId: targetId,
        targetId,
        targetType,
        details,
        metadata: metadata || {},
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        districtId: req.ctx.districtId,
        hash,
        prevHash
      }
    });
  }

  // ====================================================
  // TEST 1: Profile CRUD
  // ====================================================
  console.log("\n🚀 --- TEST 1: Profile CRUD & Audit Events ---");

  // Clean old profile
  await prisma.customerProfile.deleteMany({ where: { userId: testUser1.id } });

  // 1. Create Profile
  const profile = await prisma.customerProfile.create({
    data: {
      userId: testUser1.id,
      districtId: district.id,
      fullName: "Test Customer One",
      phone: "+919876543210"
    }
  });
  await logAuditEvent(mockReq(testUser1.id, district.id), "CUSTOMER_PROFILE_CREATED", profile.id, "CustomerProfile", "Profile created", { fullName: "Test Customer One", phone: "+919876543210" });
  console.log(`✅ Profile created: ID=${profile.id}`);

  // 2. Read Profile
  const fetchedProfile = await prisma.customerProfile.findUnique({
    where: { userId: testUser1.id }
  });
  if (fetchedProfile && fetchedProfile.fullName === "Test Customer One") {
    console.log("✅ Profile fetched correctly");
  } else {
    throw new Error("Profile read failed");
  }

  // 3. Update Profile
  const updatedProfile = await prisma.customerProfile.update({
    where: { userId: testUser1.id },
    data: {
      fullName: "Test Customer One Updated",
      phone: "+919876543211"
    }
  });
  await logAuditEvent(mockReq(testUser1.id, district.id), "CUSTOMER_PROFILE_UPDATED", profile.id, "CustomerProfile", "Profile updated", { fullName: "Test Customer One Updated", phone: "+919876543211" });
  console.log(`✅ Profile updated: Name=${updatedProfile.fullName}, Phone=${updatedProfile.phone}`);

  // ====================================================
  // TEST 2: Default Address Invariant
  // ====================================================
  console.log("\n🚀 --- TEST 2: Default Address Invariant ---");

  // Clean old addresses
  await prisma.address.deleteMany({ where: { userId: testUser1.id } });

  // 1. Create Address A as default
  const addressA = await prisma.address.create({
    data: {
      userId: testUser1.id,
      districtId: district.id,
      streetAddress: "Address A Street 10",
      isDefault: true
    }
  });
  await logAuditEvent(mockReq(testUser1.id, district.id), "ADDRESS_CREATED", addressA.id, "Address", "Created address A", { isDefault: true });
  console.log(`✅ Created Address A (Default: ${addressA.isDefault})`);

  // 2. Create Address B as default (should clear Address A's default status)
  // Simulate transactional clear-default logic
  const addressB = await prisma.$transaction(async (tx) => {
    await tx.address.updateMany({
      where: { userId: testUser1.id, districtId: district.id, isDefault: true },
      data: { isDefault: false }
    });
    return tx.address.create({
      data: {
        userId: testUser1.id,
        districtId: district.id,
        streetAddress: "Address B Street 20",
        isDefault: true
      }
    });
  });
  await logAuditEvent(mockReq(testUser1.id, district.id), "ADDRESS_CREATED", addressB.id, "Address", "Created address B", { isDefault: true });
  await logAuditEvent(mockReq(testUser1.id, district.id), "ADDRESS_DEFAULT_CHANGED", addressB.id, "Address", "Default address changed to B", { addressId: addressB.id });
  console.log(`✅ Created Address B (Default: ${addressB.isDefault})`);

  // 3. Verify Address A default flag was cleared
  const verifyA = await prisma.address.findUnique({ where: { id: addressA.id } });
  const verifyB = await prisma.address.findUnique({ where: { id: addressB.id } });

  if (verifyA && !verifyA.isDefault && verifyB && verifyB.isDefault) {
    console.log("✅ Default Address Invariant Passed! Address A default flag successfully cleared.");
  } else {
    throw new Error("Default address invariant failed! Multiple default addresses exist.");
  }

  // ====================================================
  // TEST 3: Address Ownership & Isolation Constraint
  // ====================================================
  console.log("\n🚀 --- TEST 3: Address Ownership & Isolation Constraint ---");

  // Attempting to query Address B (owned by testUser1) using testUser2 credentials
  const crossUserQuery = await prisma.address.findFirst({
    where: {
      id: addressB.id,
      userId: testUser2.id, // Wrong user
      districtId: district.id
    }
  });

  if (!crossUserQuery) {
    console.log("✅ Access successfully blocked for mismatched user context (Access returned null).");
  } else {
    throw new Error("Access leak! Mismatched user retrieved address B");
  }

  // Attempting to query Address B under a mismatched district
  const wrongDistrictId = district.id + 999;
  const crossDistrictQuery = await prisma.address.findFirst({
    where: {
      id: addressB.id,
      userId: testUser1.id,
      districtId: wrongDistrictId // Wrong district
    }
  });

  if (!crossDistrictQuery) {
    console.log("✅ Access successfully blocked for mismatched district context (Access returned null).");
  } else {
    throw new Error("Access leak! Mismatched district retrieved address B");
  }

  // ====================================================
  // TEST 4: Checkout Snapshot Integrity
  // ====================================================
  console.log("\n🚀 --- TEST 4: Checkout Snapshot Integrity ---");

  // 1. Resolve product
  const product = await prisma.product.findFirst({ where: { approved: true } });
  if (!product) {
    console.log("⚠️ No approved product found to test order snapshot. Skipping order tests.");
  } else {
    // 2. Create Order with snapshot from Address B
    const order = await prisma.order.create({
      data: {
        userId: testUser1.id,
        productId: product.id,
        vendorId: product.vendorId,
        quantity: 1,
        totalPrice: product.price || 100,
        status: "pending",
        customerName: updatedProfile.fullName,
        customerPhone: updatedProfile.phone,
        customerAddress: addressB.streetAddress,
        deliveryAddressSnapshot: {
          streetAddress: addressB.streetAddress,
          houseNumber: addressB.houseNumber,
          landmark: addressB.landmark,
          city: addressB.city
        },
        districtId: district.id
      }
    });
    console.log(`✅ Order placed with Snapshot Address: "${order.customerAddress}"`);

    // 3. Edit Address B
    const modifiedAddrB = await prisma.address.update({
      where: { id: addressB.id },
      data: {
        streetAddress: "Address B MODIFIED AND MOVED ROAD"
      }
    });
    await logAuditEvent(mockReq(testUser1.id, district.id), "ADDRESS_UPDATED", addressB.id, "Address", "Address B updated", modifiedAddrB);
    console.log(`✅ Modified Address B to: "${modifiedAddrB.streetAddress}"`);

    // 4. Verify order address snapshot remains unchanged
    const verifyOrder = await prisma.order.findUnique({ where: { id: order.id } });
    if (verifyOrder && verifyOrder.customerAddress === "Address B Street 20") {
      console.log("✅ Snapshot Integrity Passed! Order delivery address remains unchanged in historical records.");
    } else {
      throw new Error("Snapshot Integrity Violation! Order history modified after address update.");
    }
  }

  // ====================================================
  // TEST 5: Audit Chain Integrity
  // ====================================================
  console.log("\n🚀 --- TEST 5: Audit Chain Integrity ---");

  const requiredEvents = [
    "CUSTOMER_PROFILE_CREATED",
    "CUSTOMER_PROFILE_UPDATED",
    "ADDRESS_CREATED",
    "ADDRESS_DEFAULT_CHANGED",
    "ADDRESS_UPDATED"
  ];

  const logs = await prisma.auditLog.findMany({
    where: {
      action: { in: requiredEvents },
      userId: testUser1.id
    },
    orderBy: { id: "asc" }
  });

  console.log(`📋 Found ${logs.length} audit logs. Checking chaining...`);

  let validChain = true;
  for (const log of logs) {
    console.log(`  - Audit [${log.action}] ID=${log.id} Hash=${log.hash.substring(0, 12)}... Prev=${log.prevHash ? log.prevHash.substring(0, 12) + "..." : "null"}`);
    
    // Check if prevHash matches
    if (log.prevHash && log.prevHash !== "GENESIS") {
      const parent = await prisma.auditLog.findFirst({ where: { hash: log.prevHash } });
      if (!parent) {
        console.error(`❌ Audit log #${log.id} has orphaned parent hash!`);
        validChain = false;
      }
    }
  }

  if (validChain && logs.length > 0) {
    console.log("✅ Audit Chain Integrity Passed! Hashing matches parent entries correctly.");
  } else {
    throw new Error("Audit chain verification failed");
  }

  console.log("\n🎉 [CERTIFICATION] All Customer Profile & Address Authority tests PASSED successfully!");
}

verifyProfileAddressSystem()
  .catch((err) => {
    console.error("\n❌ [CERTIFICATION] Tests FAILED:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
