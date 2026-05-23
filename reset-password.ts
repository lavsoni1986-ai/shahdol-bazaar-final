import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
const prisma = new PrismaClient();

async function reset() {
  const hash = await bcrypt.hash('Admin@Shahdol2026', 10);
  await prisma.user.update({
    where: { username: 'lav_soni' },
    data: { password: hash, role: 'SUPER_ADMIN' }
  });
  console.log('Sovereign Power Restored: Hash updated directly in DB');
}
reset();