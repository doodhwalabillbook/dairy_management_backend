'use strict';

const { PrismaClient } = require('../generated/prisma');

// Use native Prisma Client for maximum stability and MySQL 8.0 compatibility
const prisma = new PrismaClient();

module.exports = prisma;
