import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('Creating new user lav_soni...')

  const password = 'Admin@Shahdol2026'
  const saltRounds = 10

  const hashedPassword = await bcrypt.hash(password, saltRounds)

  const newUser = await prisma.user.create({
    data: {
      username: 'lav_soni',
      password: hashedPassword,
      role: 'SUPER_ADMIN',
      isAdmin: true,
      email: 'lav.soni@example.com' // Placeholder email since fullName isn't in schema
    }
  })

  console.log(`User created successfully:`)
  console.log(`ID: ${newUser.id}`)
  console.log(`Username: ${newUser.username}`)
  console.log(`Role: ${newUser.role}`)
  console.log(`Is Admin: ${newUser.isAdmin}`)
}

main()
  .catch(e => {
    console.error('Error creating user:', e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())