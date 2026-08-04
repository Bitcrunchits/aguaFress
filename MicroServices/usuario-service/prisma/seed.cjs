const { PrismaClient } = require('../src/generated/prisma/index.js');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
  const email = 'adm-test@aguafress.test';
  const password = 'test-adm';
  const nombre = 'Admin';
  const apellido = 'Test';

  const existing = await prisma.authUser.findUnique({ where: { email } });
  if (existing) {
    console.log(`[seed] SUPER_ADMIN ya existe: ${email}`);
    return;
  }

  const hash = await bcrypt.hash(password, 10);

  await prisma.authUser.create({
    data: {
      email,
      password: hash,
      role: 'super_admin',
      is_active: true,
      is_verified: true,
      super_admin: {
        create: { nombre, apellido },
      },
    },
  });

  console.log(`[seed] SUPER_ADMIN creado: ${email} / ${password}`);
}

main()
  .catch((e) => {
    console.error('[seed] ERROR:', e.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
