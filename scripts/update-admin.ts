import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { hashPassword, generateSecurePassword } from '../server/auth/password';

const prisma = new PrismaClient();

async function main() {
  const username = process.env.ADMIN_USERNAME || 'admin';
  const rawPassword = process.env.ADMIN_PASSWORD || generateSecurePassword(16);
  const hashedPassword = hashPassword(rawPassword);

  const defaultDistrict = await prisma.district.findFirst({
    where: { isDefault: true }
  });
  const districtId = defaultDistrict ? defaultDistrict.id : 1;

  const user = await prisma.user.upsert({
    where: { username },
    update: {
      password: hashedPassword,
      role: 'SUPER_ADMIN',
      isAdmin: true,
    },
    create: {
      username,
      password: hashedPassword,
      role: 'SUPER_ADMIN',
      isAdmin: true,
      districtId,
    }
  });

  console.log(`✅ Admin user credential updated: username=${user.username}, role=${user.role}`);
}

main()
  .then(() => prisma.$disconnect())
  .catch((err) => {
    console.error('❌ Admin update error:', err.message || err);
    prisma.$disconnect();
    process.exit(1);
  });