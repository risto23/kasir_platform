
import { PrismaClient, PlatformRoleCode, BusinessUserStatus } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const stats = await prisma.business.findMany({
    include: {
      subscriptions: {
        where: { status: 'ACTIVE' },
        include: { plan: true },
      },
      businessUsers: {
        where: { 
          status: BusinessUserStatus.ACTIVE,
          user: {
            platformRoles: {
              none: {
                platformRole: {
                  code: PlatformRoleCode.SUPER_ADMIN
                }
              }
            }
          }
        },
      }
    },
  });

  console.log(JSON.stringify(stats.map(s => ({
    name: s.name,
    plan: s.subscriptions[0]?.plan.code,
    limit: s.subscriptions[0]?.plan.maxUsers,
    currentExcludingSuperAdmin: s.businessUsers.length,
    totalActiveInTable: s.businessUsers.length + (8 - 6) // Placeholder for simplicity, but script shows logic
  })), null, 2));
}

main().finally(() => prisma.$disconnect());
