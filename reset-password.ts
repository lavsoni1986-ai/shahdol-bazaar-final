import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
const prisma = new PrismaClient();

async function reset() {
  const newPassword = process.env.ADMIN_PASSWORD;
  if (!newPassword) {
    console.error('❌ Error: ADMIN_PASSWORD environment variable must be set.');
    process.exit(1);
  }
  const hash = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({
    where: { username: 'lav_soni' },
    data: { password: hash, role: 'SUPER_ADMIN' }
  });
  console.log('Sovereign Power Restored: Hash updated directly in DB');
}
reset();