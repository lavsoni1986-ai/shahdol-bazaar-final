import { prisma } from "../storage";

// Generic count functions that accept where clause
export async function countUsers(where: any) {
  return prisma.user.count({ where });
}

export async function countVendors(where: any) {
  return prisma.vendor.count({ where });
}

export async function countProducts(where: any) {
  return prisma.product.count({ where });
}

export async function countOrders(where: any) {
  return prisma.order.count({ where });
}

export async function aggregateOrders(where: any, _sum: any) {
  return prisma.order.aggregate({ where, _sum });
}

// Specific functions for admin.service.ts
export async function getAdminMetrics(districtId: number) {
  const [
    totalUsers,
    totalVendors,
    pendingProducts,
    approvedProducts,
    totalOrders,
    pendingOrders,
    completedOrders,
    totalRevenue
  ] = await Promise.all([
    countUsers({ districtId }),
    countVendors({ districtId }),
    countProducts({ vendor: { districtId }, approved: false }),
    countProducts({ vendor: { districtId }, approved: true }),
    countOrders({ vendor: { districtId } }),
    countOrders({ vendor: { districtId }, status: 'pending' }),
    countOrders({ vendor: { districtId }, status: 'completed' }),
    aggregateOrders({ vendor: { districtId } }, { totalPrice: true }).then(agg => agg._sum.totalPrice || 0)
  ]);

  return {
    totalUsers,
    totalVendors,
    totalProducts: pendingProducts + approvedProducts,
    pendingApprovals: pendingProducts,
    approvedProducts,
    totalOrders,
    pendingOrders,
    completedOrders,
    totalRevenue
  };
}
