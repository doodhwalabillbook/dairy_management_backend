const path = require('path');
const dotenv = require('dotenv');

const projectRoot = path.resolve(__dirname, '..');

// 1. Determine NODE_ENV first from the process environment (defaulting to 'local')
const nodeEnv = process.env.NODE_ENV || 'local';

// 2. Load the environment-specific file (e.g. .env.local or .env.development) with override: true
dotenv.config({ path: path.resolve(projectRoot, `.env.${nodeEnv}`), override: true });

// 3. Load the default .env file next, but do NOT override already defined process environment variables
dotenv.config({ path: path.resolve(projectRoot, '.env'), override: false });

const { PrismaClient } = require('../src/generated/prisma');
const { PrismaMariaDb } = require('@prisma/adapter-mariadb');

let databaseUrl = process.env.DATABASE_URL;

if (process.env.NODE_ENV !== 'production' && databaseUrl) {
  const separator = databaseUrl.includes('?') ? '&' : '?';
  databaseUrl = `${databaseUrl}${separator}allowPublicKeyRetrieval=true`;
}

const adapter = new PrismaMariaDb(databaseUrl);
const prisma = new PrismaClient({ adapter });

const plans = [
  {
    planCode: 'FREE',
    planName: 'FREE',
    description: 'Free tier for starting vendors (10 Customers limit)',
    price: 0.00,
    customerLimit: 10,
    durationDays: 30,
    isActive: true
  },
  {
    planCode: 'BASIC',
    planName: 'BASIC',
    description: 'Basic tier for growing vendors (50 Customers limit)',
    price: 49.00,
    customerLimit: 50,
    durationDays: 30,
    isActive: true
  },
  {
    planCode: 'STANDARD',
    planName: 'STANDARD',
    description: 'Standard tier for established vendors (100 Customers limit)',
    price: 99.00,
    customerLimit: 100,
    durationDays: 30,
    isActive: true
  },
  {
    planCode: 'PREMIUM',
    planName: 'PREMIUM',
    description: 'Premium tier with unlimited customers',
    price: 199.00,
    customerLimit: null,
    durationDays: 30,
    isActive: true
  }
];

const settings = [
  {
    settingKey: 'SUBSCRIPTION_GRACE_PERIOD_DAYS',
    settingValue: '7',
    description: 'Number of grace period days for an expired subscription'
  },
  {
    settingKey: 'SUBSCRIPTION_WARNING_DAYS',
    settingValue: '5',
    description: 'Number of warning days before subscription expiration'
  }
];

async function main() {
  console.log('🌱 Starting database seeding...');

  // 1. Seed Subscription Plans
  for (const plan of plans) {
    const upsertedPlan = await prisma.subscriptionPlan.upsert({
      where: { planCode: plan.planCode },
      update: {
        planName: plan.planName,
        description: plan.description,
        price: plan.price,
        customerLimit: plan.customerLimit,
        durationDays: plan.durationDays,
        isActive: plan.isActive
      },
      create: plan
    });
    console.log(`Upserted subscription plan: ${upsertedPlan.planCode}`);
  }

  // 2. Seed System Settings
  for (const setting of settings) {
    const upsertedSetting = await prisma.systemSetting.upsert({
      where: { settingKey: setting.settingKey },
      update: {
        settingValue: setting.settingValue,
        description: setting.description
      },
      create: setting
    });
    console.log(`Upserted system setting: ${upsertedSetting.settingKey}`);
  }

  // 3. Seed Default Super Admin
  const bcrypt = require('bcrypt');
  const pinHash = await bcrypt.hash('123456', 10);
  const passwordHash = await bcrypt.hash('AdminPassword123', 10);
  const adminMobile = '9999999999';
  const adminEmail = 'admin@dairytrack.com';

  const upsertedAdmin = await prisma.user.upsert({
    where: { mobile: adminMobile },
    update: {
      email: adminEmail,
      passwordHash: passwordHash,
      role: 'ADMIN',
      name: 'Super Admin'
    },
    create: {
      mobile: adminMobile,
      name: 'Super Admin',
      pinHash: pinHash,
      email: adminEmail,
      passwordHash: passwordHash,
      role: 'ADMIN',
      isActive: true
    }
  });
  console.log(`Upserted default admin: ${upsertedAdmin.email} (${upsertedAdmin.mobile})`);

  console.log('✅ Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
