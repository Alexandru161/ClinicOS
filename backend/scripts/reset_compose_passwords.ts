import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

type PasswordUpdate = {
  email: string;
  password: string;
  role?: 'ADMIN' | 'DOCTOR' | 'RECEPTIONIST';
};

function loadPasswordUpdates(): PasswordUpdate[] {
  const raw = process.env.PASSWORD_UPDATES_JSON;

  if (!raw) {
    throw new Error('Set PASSWORD_UPDATES_JSON to a JSON array of { email, password, role? }.');
  }

  const parsed = JSON.parse(raw) as unknown;
  if (!Array.isArray(parsed) || parsed.length === 0) {
    throw new Error('PASSWORD_UPDATES_JSON must contain at least one password update entry.');
  }

  return parsed.map((item) => {
    if (!item || typeof item !== 'object') {
      throw new Error('PASSWORD_UPDATES_JSON contains an invalid entry.');
    }

    const candidate = item as Record<string, unknown>;
    if (typeof candidate.email !== 'string' || typeof candidate.password !== 'string') {
      throw new Error('Each password update must include email and password strings.');
    }

    const role = candidate.role;
    if (role !== undefined && role !== 'ADMIN' && role !== 'DOCTOR' && role !== 'RECEPTIONIST') {
      throw new Error(`Unsupported role for ${candidate.email}.`);
    }

    return {
      email: candidate.email,
      password: candidate.password,
      role
    };
  });
}

async function main() {
  const passwordUpdates = loadPasswordUpdates();

  for (const entry of passwordUpdates) {
    const passwordHash = await bcrypt.hash(entry.password, 12);

    const result = await prisma.user.updateMany({
      where: { email: entry.email },
      data: {
        passwordHash,
        role: entry.role
      }
    });

    if (result.count === 0) {
      throw new Error(`User not found: ${entry.email}`);
    }

    console.log(`Updated password for ${entry.email}`);
  }
}

main()
  .catch((error) => {
    console.error('Password reset failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });