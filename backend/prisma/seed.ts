import { PrismaClient, Plan, SubscriptionStatus } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create admin user
  const adminPassword = await bcrypt.hash('admin123', 12);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@krd-prodown.com' },
    update: {},
    create: {
      name: 'Admin',
      email: 'admin@krd-prodown.com',
      password: adminPassword,
      role: 'admin',
      emailVerified: true,
      level: 'diamond',
      points: 10000,
      subscription: {
        create: {
          plan: Plan.premium,
          status: SubscriptionStatus.active,
        },
      },
    },
  });

  console.log(`✅ Admin user created: ${admin.email}`);

  // Create test user
  const testPassword = await bcrypt.hash('test123', 12);
  const testUser = await prisma.user.upsert({
    where: { email: 'test@krd-prodown.com' },
    update: {},
    create: {
      name: 'Test User',
      email: 'test@krd-prodown.com',
      password: testPassword,
      role: 'user',
      emailVerified: true,
      level: 'silver',
      points: 500,
      subscription: {
        create: {
          plan: Plan.free,
          status: SubscriptionStatus.active,
        },
      },
    },
  });

  console.log(`✅ Test user created: ${testUser.email}`);
  console.log('🌱 Seeding complete!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
