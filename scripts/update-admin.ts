import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  // Create admin user with strong password (12+ chars)
  const hashedPassword = bcrypt.hashSync('Admin@123456', 10);
  
  const user = await prisma.user.upsert({
    where: { username: 'admin' },
    update: { password: hashedPassword },
    create: {
      username: 'admin',
      password: hashedPassword,
      email: 'admin@shahdolbazaar.com',
      role: 'SUPER_ADMIN',
      isAdmin: true,
      districtId: 121
    }
  });
  
  console.log('✅ Admin user updated with strong password');
  console.log('✅ Password: Admin@123456');
}

main()
  .then(() => prisma.$disconnect())
  .catch(console.error);