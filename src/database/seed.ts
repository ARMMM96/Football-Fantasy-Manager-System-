import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';

const connectionString = `${process.env.DATABASE_URL}`;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🌱 Start seeding all models...');

  // 1. Roles [cite: 2]
  const adminRole = await prisma.role.upsert({
    where: { code: 'ADMIN' },
    update: {},
    create: {
      code: 'ADMIN',
      name: 'Administrator',
      permissions: ["*"],
    },
  });

  const userRole = await prisma.role.upsert({
    where: { code: 'USER' },
    update: {},
    create: {
      code: 'USER',
      name: 'Regular User',
      permissions: [],
    },
  });

  // 2. Users [cite: 3, 4]
  const salt = await bcrypt.genSalt(10);
  const hashedAdminPassword = await bcrypt.hash('Admin@123', salt);
  const hashedUserPassword = await bcrypt.hash('User@123', salt);

  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@football.com' },
    update: {},
    create: {
      email: 'admin@football.com',
      passwordHash: hashedAdminPassword,
      roleId: adminRole.id,
      isActive: true,
    },
  });

  const normalUser = await prisma.user.upsert({
    where: { email: 'manager@football.com' },
    update: {},
    create: {
      email: 'manager@football.com',
      passwordHash: hashedUserPassword,
      roleId: userRole.id,
      isActive: true,
    },
  });

  // 3. Teams [cite: 7]
  const team = await prisma.team.upsert({
    where: { userId: normalUser.id },
    update: {},
    create: {
      userId: normalUser.id,
      name: 'Cairo Knights',
      country: 'Egypt',
      budget: 15000000.00,
      totalPlayers: 2,
      isTeamReady: true,
    },
  });

  const adminTeam = await prisma.team.upsert({
    where: { userId: adminUser.id },
    update: {},
    create: {
      userId: adminUser.id,
      name: 'System Giants',
      country: 'Global',
      budget: 50000000.00,
    },
  });

  // 4. Players [cite: 11, 12]
  const player1 = await prisma.player.create({
    data: {
      teamId: team.id,
      firstName: 'Mohamed',
      lastName: 'Salah',
      nationality: 'Egypt',
      position: 'ATT',
      marketValue: 5000000.00,
      age: 31,
      isOnTransferList: true,
      askingPrice: 5500000.00,
    },
  });

  const player2 = await prisma.player.create({
    data: {
      teamId: team.id,
      firstName: 'Alisson',
      lastName: 'Becker',
      nationality: 'Brazil',
      position: 'GK',
      marketValue: 3000000.00,
      age: 31,
    },
  });

  // 5. Transfer System [cite: 14, 15]
  const listing = await prisma.transferListing.create({
    data: {
      playerId: player1.id,
      sellerTeamId: team.id,
      askingPrice: 5500000.00,
      status: 'ACTIVE',
    },
  });

  const transaction = await prisma.transferTransaction.create({
    data: {
      playerId: player2.id,
      sellerTeamId: adminTeam.id,
      buyerTeamId: team.id,
      askingPrice: 3000000.00,
      salePrice: 2800000.00,
      commission: 140000.00,
    },
  });

  // 6. Finance & Audit [cite: 9, 10, 16, 17]
  await prisma.teamFinance.create({
    data: {
      teamId: team.id,
      transactionType: 'TRANSFER_BUY',
      amount: 2800000.00,
      balanceAfter: 12200000.00,
      description: 'Bought player Alisson Becker',
      referenceTransactionId: transaction.id,
    },
  });

  await prisma.auditLog.create({
    data: {
      entityType: 'USER',
      entityId: normalUser.id,
      action: 'REGISTER',
      userId: normalUser.id,
      changes: { status: 'new_registration' },
    },
  });

  console.log('🚀 Seeding finished! All tables populated.');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });