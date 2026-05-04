
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const business = await prisma.business.findUnique({
    where: { slug: 'demo-retail' },
    include: {
      businessUsers: {
        where: { status: 'ACTIVE' },
        include: { user: true, businessRole: true }
      }
    }
  });

  if (!business) return;

  console.log(`Business: ${business.name}`);
  business.businessUsers.forEach((bu, index) => {
    console.log(`${index + 1}. ${bu.user.fullName} (${bu.user.email}) - Role: ${bu.businessRole.code}`);
  });
}

main().finally(() => prisma.$disconnect());
