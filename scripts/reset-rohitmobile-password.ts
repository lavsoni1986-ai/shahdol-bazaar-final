import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { hashPassword, generateSecurePassword, verifyPassword } from '../server/auth/password';

const prisma = new PrismaClient();

async function resetRohitMobilePassword() {
  const targetUsername = 'rohitmobile';

  // 1. Find ONLY user username "rohitmobile"
  const user = await prisma.user.findUnique({
    where: { username: targetUsername },
  });

  if (!user) {
    console.error(`❌ User '${targetUsername}' not found.`);
    process.exit(1);
  }

  // 2. Verify role is MERCHANT before update
  if (user.role !== 'MERCHANT') {
    console.error(`❌ Expected role MERCHANT, found: ${user.role}`);
    process.exit(1);
  }

  // 3. Generate cryptographically secure temporary password using existing generateSecurePassword()
  const tempPassword = generateSecurePassword(12);

  // 4. Hash using existing hashPassword()
  const hashedPassword = hashPassword(tempPassword);

  // 5. Update ONLY User.password
  await prisma.user.update({
    where: { id: user.id },
    data: {
      password: hashedPassword,
    },
  });

  // 6. After update, verify user exists, role remains MERCHANT, and password verifies correctly
  const verifiedUser = await prisma.user.findUnique({
    where: { id: user.id },
  });

  if (!verifiedUser) {
    console.error('❌ Verification failed: user missing after update.');
    process.exit(1);
  }

  if (verifiedUser.role !== 'MERCHANT') {
    console.error(`❌ Verification failed: role altered to ${verifiedUser.role}`);
    process.exit(1);
  }

  const isValid = verifyPassword(tempPassword, verifiedUser.password);
  if (!isValid) {
    console.error('❌ Verification failed: password does not verify with verifyPassword().');
    process.exit(1);
  }

  // 7. Print ONLY the generated temporary password to terminal (no hashes)
  console.log(`STATUS: SUCCESS`);
  console.log(`USER: ${verifiedUser.username}`);
  console.log(`ROLE: ${verifiedUser.role}`);
  console.log(`TEMPORARY_PASSWORD: ${tempPassword}`);
}

resetRohitMobilePassword()
  .then(() => prisma.$disconnect())
  .catch((err) => {
    console.error('❌ Execution error:', err.message || err);
    prisma.$disconnect();
    process.exit(1);
  });
