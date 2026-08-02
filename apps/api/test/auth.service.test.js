const test = require('node:test');
const assert = require('node:assert/strict');
const { AuthService } = require('../dist/auth/auth.service');

test('login uses demo fallback without querying Prisma when the database is unavailable', async () => {
  let findFirstCalled = false;
  const prisma = {
    isAvailable: async () => false,
    user: {
      findFirst: async () => {
        findFirstCalled = true;
        throw new Error('should not query');
      },
    },
  };

  const service = new AuthService(prisma);
  const result = await service.login('admin@hmatpharmacy.local', 'admin1234');

  assert.equal(findFirstCalled, false);
  assert.equal(result.user.role, 'admin');
  assert.equal(result.user.displayName, 'System Admin');
});
