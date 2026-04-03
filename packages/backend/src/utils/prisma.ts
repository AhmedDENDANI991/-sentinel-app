import { PrismaClient } from '@prisma/client';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, '../../prisma/sentinel.db');

// Use SQLite file URL if DATABASE_URL not set or still points to PostgreSQL
const dbUrl = (!process.env.DATABASE_URL || process.env.DATABASE_URL.includes('postgresql'))
  ? `file:${DB_PATH}`
  : process.env.DATABASE_URL;

export const prisma = new PrismaClient({
  datasources: { db: { url: dbUrl } },
  log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
});

// Graceful shutdown
process.on('beforeExit', async () => {
  await prisma.$disconnect();
});
