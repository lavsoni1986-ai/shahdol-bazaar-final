import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const hashedPassword = bcrypt.hashSync('admin123', 10);
  
  const user = await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      password: hashedPassword,
      email: 'admin@shahdolbazaar.com',
      role: 'SUPER_ADMIN',
      isAdmin: true,
      districtId: 121
    }
  });
  
  console.log('✅ Admin user created:', user.username);
  console.log('✅ Password: admin123');
}

main()
  .then(() => prisma.$disconnect())
  .catch(console.error);