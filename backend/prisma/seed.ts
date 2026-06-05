import bcrypt from 'bcryptjs';
import { PrismaClient, Role } from '@prisma/client';

const prisma = new PrismaClient();
const bootstrapAdminEmail = process.env.BOOTSTRAP_ADMIN_EMAIL;
const bootstrapAdminPassword = process.env.BOOTSTRAP_ADMIN_PASSWORD;
const bootstrapAdminName = process.env.BOOTSTRAP_ADMIN_NAME ?? 'Clinic Administrator';

const staffRoles = [
  { code: Role.ADMIN, name: 'Administrator', description: 'Full clinic system access' },
  { code: Role.DOCTOR, name: 'Doctor', description: 'Clinical access to assigned patients and appointments' },
  { code: Role.RECEPTIONIST, name: 'Receptionist', description: 'Front desk scheduling and patient operations' }
];


async function ensureRoles() {
  for (const role of staffRoles) {
    await prisma.staffRole.upsert({
      where: { code: role.code },
      update: {
        name: role.name,
        description: role.description
      },
      create: role
    });
  }
}

async function ensureBootstrapAdmin() {
  if (!bootstrapAdminEmail || !bootstrapAdminPassword) {
    console.log('Skipping bootstrap admin seed. Set BOOTSTRAP_ADMIN_EMAIL and BOOTSTRAP_ADMIN_PASSWORD to create one.');
    return;
  }

  if (bootstrapAdminPassword.length < 12) {
    throw new Error('BOOTSTRAP_ADMIN_PASSWORD must contain at least 12 characters.');
  }

  const passwordHash = await bcrypt.hash(bootstrapAdminPassword, 12);

  await prisma.user.upsert({
    where: { email: bootstrapAdminEmail },
    update: {
      fullName: bootstrapAdminName,
      role: Role.ADMIN,
      isActive: true
    },
    create: {
      email: bootstrapAdminEmail,
      fullName: bootstrapAdminName,
      role: Role.ADMIN,
      isActive: true,
      passwordHash
    }
  });
}


async function main() {
  await ensureRoles();
  await ensureBootstrapAdmin();
  console.log('Seed completed.');
}

main()
  .catch((error) => {
    console.error('Seed failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
