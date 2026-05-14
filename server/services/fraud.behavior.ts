import { prisma } from '../storage';

export async function computeBehaviorProfile(vendorId: number) {
  const last7Days = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const reviews = await prisma.review.findMany({
    where: {
      product: { vendorId },
      createdAt: { gte: last7Days }
    }
  });

  const orders = await prisma.order.count({
    where: { vendorId, createdAt: { gte: last7Days } }
  });

  const clicks = await prisma.userEvent.count({
    where: { vendorId, action: "CLICK", createdAt: { gte: last7Days } }
  });

  const repeatOrders = await prisma.order.count({
    where: { vendorId, isRepeat: true }
  });

  const complaints = await prisma.order.count({
    where: { vendorId, status: "FAILED" }
  });

  // Bot detection: Same IP clicking rapidly
  const last1Hour = new Date(Date.now() - 60 * 60 * 1000);
  const ipGroups = await prisma.userEvent.groupBy({
    by: ['ipAddress'],
    where: {
      vendorId,
      action: "CLICK",
      createdAt: { gte: last1Hour },
      ipAddress: { not: null }
    },
    _count: { id: true }
  });

  const maxSameIPClicks = Math.max(...ipGroups.map(g => g._count.id), 0);

  const avgRating =
    reviews.length > 0
      ? reviews.reduce((a, b) => a + b.rating, 0) / reviews.length
      : 0;

  const ratingVelocity = reviews.length / 7;
  const conversionRate = clicks > 0 ? orders / clicks : 0;
  const repeatRate = orders > 0 ? repeatOrders / orders : 0;
  const complaintRate = orders > 0 ? complaints / orders : 0;

  return {
    avgRating,
    ratingVelocity,
    conversionRate,
    repeatRate,
    complaintRate,
    ordersCount: orders,
    maxSameIPClicks
  };
}