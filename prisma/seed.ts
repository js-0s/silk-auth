import { PrismaClient } from '../.generated/prisma/client';
import crypto from 'crypto';

const db = new PrismaClient({
  log: ['error'],
});

function selectRandom<T>(array: T[]): T {
  if (array.length === 0) {
    throw new Error('to use selectRandom, provide a list of values');
  }
  const randomIndex = Math.floor(Math.random() * array.length);
  return array[randomIndex];
}

function randomAddress(): string {
  // Generate a random 40-character hexadecimal string
  const randomHexString = Array.from({ length: 40 }, () =>
    Math.floor(Math.random() * 16).toString(16),
  ).join('');

  // Prefix with '0x' to resemble an Ethereum address
  return '0x' + randomHexString;
}
async function createUsers(amount: number, roles: string[]) {
  const userPromises = [];
  for (let i = 0; i < 100; i++) {
    userPromises.push(
      db.user.create({
        data: {
          address: randomAddress(),
          roles,
        },
      }),
    );
  }
  return await Promise.all(userPromises);
}

async function main() {
  const testUsers = await createUsers(100, ['user']);

  console.log(`Seeded ${testUsers.length} users`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
