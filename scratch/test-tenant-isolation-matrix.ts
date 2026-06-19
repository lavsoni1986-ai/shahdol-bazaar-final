import { prisma, tenantContext } from "../server/storage";
import { tenantResolver } from "../server/middleware/tenantResolver";
import { requireAuth, optionalAuth } from "../server/auth/middleware";
import { generateAccessToken } from "../server/auth/jwt";
import { createUser } from "../server/repositories/user.repo";

function mockReq(options: {
  headers?: Record<string, string>;
  cookies?: Record<string, string>;
  originalUrl: string;
}) {
  return {
    headers: options.headers || {},
    cookies: options.cookies || {},
    originalUrl: options.originalUrl,
    method: "GET",
    path: options.originalUrl,
    user: undefined,
    ctx: undefined,
    districtId: undefined,
    districtSlug: undefined,
    requestId: "test-req-" + Math.random().toString(36).substring(7),
  } as any;
}

function mockRes() {
  const res: any = {
    statusCode: 200,
    headers: {},
    body: undefined,
    sent: false,
  };
  res.status = (code: number) => {
    res.statusCode = code;
    return res;
  };
  res.json = (data: any) => {
    res.body = data;
    res.sent = true;
    return res;
  };
  return res;
}

async function runMiddlewares(req: any, res: any, middlewares: any[]) {
  for (const mw of middlewares) {
    if (res.sent) break;
    await new Promise<void>((resolve, reject) => {
      const originalJson = res.json;
      res.json = (data: any) => {
        const result = originalJson(data);
        resolve();
        return result;
      };
      
      mw(req, res, (err?: any) => {
        // Restore original json method
        res.json = originalJson;
        if (err) reject(err);
        else resolve();
      });
    });
  }
}

async function testScenario(
  name: string,
  url: string,
  headers: Record<string, string>,
  cookies: Record<string, string>,
  useRequireAuth: boolean,
  expectedDistrictId: number | null | "BLOCKED"
) {
  const req = mockReq({ headers, cookies, originalUrl: url });
  const res = mockRes();

  let resolvedStore: any = null;

  // Run within tenantContext.run to emulate request pipeline
  await new Promise<void>((resolve, reject) => {
    tenantContext.run({ districtId: -1, requestId: req.requestId }, async () => {
      try {
        const middlewares = [tenantResolver];
        if (useRequireAuth) {
          middlewares.push(requireAuth);
        } else {
          middlewares.push(optionalAuth);
        }

        await runMiddlewares(req, res, middlewares);
        resolvedStore = tenantContext.getStore();
        resolve();
      } catch (err) {
        reject(err);
      }
    });
  });

  const finalDistrictId = res.sent && res.statusCode >= 400 ? "BLOCKED" : resolvedStore?.districtId;
  const isMatch = finalDistrictId === expectedDistrictId;

  console.log(`Scenario [${name}]`);
  console.log(`  - URL: ${url}`);
  console.log(`  - Headers: ${JSON.stringify(headers)}`);
  console.log(`  - Expected District ID: ${expectedDistrictId}`);
  console.log(`  - Resolved req.districtId: ${req.districtId}`);
  console.log(`  - Resolved ALS districtId: ${finalDistrictId}`);
  console.log(`  - Verdict: ${isMatch ? "✅ PASS" : "❌ FAIL"}`);
  console.log(`  - Status Code / Body: ${res.statusCode} / ${JSON.stringify(res.body)}\n`);

  return { name, pass: isMatch, finalDistrictId, resCode: res.statusCode };
}

async function main() {
  console.log("🚀 STARTING BHARATOS SEV-1 TENANT Isolation TEST SUITE\n");

  // 1. Ensure test districts and users exist
  console.log("⏳ Ensuring test database records...");
  let shahdol = await prisma.district.findFirst({ where: { slug: "shahdol" } });
  if (!shahdol) {
    shahdol = await prisma.district.create({
      data: { name: "Shahdol", slug: "shahdol", isActive: true, state: "Madhya Pradesh" },
    });
  }

  let bhopal = await prisma.district.findFirst({ where: { slug: "bhopal" } });
  if (!bhopal) {
    bhopal = await prisma.district.create({
      data: { name: "Bhopal", slug: "bhopal", isActive: true, state: "Madhya Pradesh" },
    });
  }

  // Clear existing test users if they exist to avoid unique constraint violations
  await prisma.user.deleteMany({
    where: {
      username: { in: ["test_shahdol_user", "test_bhopal_user", "test_bhopal_admin"] },
    },
  });

  const shahdolUser = await createUser({
    username: "test_shahdol_user",
    password: "password123",
    role: "MERCHANT",
    districtId: shahdol.id,
  });

  const bhopalUser = await createUser({
    username: "test_bhopal_user",
    password: "password123",
    role: "MERCHANT",
    districtId: bhopal.id,
  });

  const bhopalAdmin = await createUser({
    username: "test_bhopal_admin",
    password: "password123",
    role: "CITY_ADMIN",
    districtId: bhopal.id,
  });

  console.log("✅ Seeded test users:");
  console.log(`  - Shahdol User ID: ${shahdolUser.id} (District: ${shahdolUser.districtId})`);
  console.log(`  - Bhopal User ID: ${bhopalUser.id} (District: ${bhopalUser.districtId})`);
  console.log(`  - Bhopal Admin ID: ${bhopalAdmin.id} (District: ${bhopalAdmin.districtId})\n`);

  // 2. Generate access tokens
  const shahdolToken = generateAccessToken({
    userId: shahdolUser.id,
    username: shahdolUser.username,
    role: shahdolUser.role as any,
    districtId: shahdol.id,
    tokenVersion: 1,
  });

  const bhopalToken = generateAccessToken({
    userId: bhopalUser.id,
    username: bhopalUser.username,
    role: bhopalUser.role as any,
    districtId: bhopal.id,
    tokenVersion: 1,
  });

  const bhopalAdminToken = generateAccessToken({
    userId: bhopalAdmin.id,
    username: bhopalAdmin.username,
    role: bhopalAdmin.role as any,
    districtId: bhopal.id,
    tokenVersion: 1,
  });

  const results: any[] = [];

  // A. Header=Shahdol JWT=Shahdol
  results.push(await testScenario(
    "A. Header=Shahdol JWT=Shahdol",
    "/api/orders",
    { "x-district-slug": "shahdol" },
    { accessToken: shahdolToken },
    true,
    shahdol.id
  ));

  // B. Header=Shahdol JWT=Bhopal
  results.push(await testScenario(
    "B. Header=Shahdol JWT=Bhopal (SPOOF ATTACK)",
    "/api/orders",
    { "x-district-slug": "shahdol" },
    { accessToken: bhopalToken },
    true,
    bhopal.id // Expected: Bhopal, NOT Shahdol (ignored spoofed header!)
  ));

  // C. Missing Header JWT=Bhopal
  // Note: For authenticated endpoints in index.ts, tenantResolver runs first globally.
  // Missing header will cause tenantResolver to block (returns 400).
  results.push(await testScenario(
    "C. Missing Header JWT=Bhopal",
    "/api/orders",
    {},
    { accessToken: bhopalToken },
    true,
    "BLOCKED"
  ));

  // D. Invalid Header JWT=Bhopal
  // Note: tenantResolver will reject invalid header with 404 (District not found).
  results.push(await testScenario(
    "D. Invalid Header JWT=Bhopal",
    "/api/orders",
    { "x-district-slug": "invalid-district" },
    { accessToken: bhopalToken },
    true,
    "BLOCKED"
  ));

  // E. Guest Marketplace Browse
  // Note: optionalAuth runs, no token, resolver processes header.
  results.push(await testScenario(
    "E. Guest Marketplace Browse",
    "/api/marketplace/products",
    { "x-district-slug": "shahdol" },
    {},
    false,
    shahdol.id
  ));

  // F. Guest Store Page
  results.push(await testScenario(
    "F. Guest Store Page",
    "/api/marketplace/stores",
    { "x-district-slug": "bhopal" },
    {},
    false,
    bhopal.id
  ));

  // G. Merchant Dashboard
  results.push(await testScenario(
    "G. Merchant Dashboard (SPOOF ATTACK)",
    "/api/merchant/products",
    { "x-district-slug": "shahdol" },
    { accessToken: bhopalToken },
    true,
    bhopal.id // Expected: Bhopal, NOT Shahdol (ignored spoofed header!)
  ));

  // H. Admin Dashboard
  results.push(await testScenario(
    "H. Admin Dashboard (SPOOF ATTACK)",
    "/api/admin/vendors",
    { "x-district-slug": "shahdol" },
    { accessToken: bhopalAdminToken },
    true,
    bhopal.id // Expected: Bhopal, NOT Shahdol (ignored spoofed header!)
  ));

  // 3. Print final report summary
  console.log("====================================================");
  console.log("FINAL RESULTS SUMMARY");
  console.log("====================================================");
  let allPassed = true;
  for (const r of results) {
    if (!r.pass) allPassed = false;
    console.log(`- ${r.name}: ${r.pass ? "PASS" : "FAIL"}`);
  }
  console.log("====================================================");

  if (allPassed) {
    console.log("\nVERDICT: TENANT ISOLATION RESTORED 🎉");
  } else {
    console.log("\nVERDICT: TENANT ISOLATION NOT RESTORED ❌");
  }

  // Clean up test data
  console.log("\n🧹 Cleaning up test users from DB...");
  await prisma.user.deleteMany({
    where: {
      username: { in: ["test_shahdol_user", "test_bhopal_user", "test_bhopal_admin"] },
    },
  });
  console.log("🧹 DB clean completed.");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
