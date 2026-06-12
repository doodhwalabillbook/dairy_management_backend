'use strict';

const { PrismaClient } = require('../generated/prisma');
const { PrismaMariaDb } = require('@prisma/adapter-mariadb');

let databaseUrl = process.env.DATABASE_URL;

if (process.env.NODE_ENV !== 'production' && databaseUrl) {
  // For development/local MySQL 8.0+ support, allow client-side public key retrieval
  const separator = databaseUrl.includes('?') ? '&' : '?';
  databaseUrl = `${databaseUrl}${separator}allowPublicKeyRetrieval=true`;
}

const adapter = new PrismaMariaDb(databaseUrl);
const prisma = new PrismaClient({ adapter });

module.exports = prisma;
