import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  await prisma.$executeRaw`CREATE EXTENSION IF NOT EXISTS pgcrypto`;

  // Ensure id has a uuid default
  await prisma.$executeRawUnsafe(`ALTER TABLE roles ALTER COLUMN id SET DEFAULT gen_random_uuid()`);

  // Ensure updatedAt has a default
  await prisma.$executeRawUnsafe(`ALTER TABLE roles ALTER COLUMN "updatedAt" SET DEFAULT now()`);

  // Insert canonical roles
  await prisma.$executeRaw`
    INSERT INTO roles (code, name, description)
    VALUES
      ('ADMIN', 'Administrator', 'Full clinic system access'),
      ('DOCTOR', 'Doctor', 'Clinical access to assigned patients and appointments'),
      ('RECEPTIONIST', 'Receptionist', 'Front desk scheduling and patient operations')
    ON CONFLICT (code) DO NOTHING
  `;

  console.log('Roles fixed/ensured');
}

main()
  .catch((e) => {
    console.error('fix_roles failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
