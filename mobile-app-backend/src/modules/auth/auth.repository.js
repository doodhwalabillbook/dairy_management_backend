const prisma = require('../../config/prisma');

class AuthRepository {
  async findUserByMobile(mobile) {
    return prisma.user.findUnique({ where: { mobile } });
  }

  async createUser(userData) {
    return prisma.user.create({ data: userData });
  }
}

module.exports = new AuthRepository();
