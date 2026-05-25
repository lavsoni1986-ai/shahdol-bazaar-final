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

  const clickEvents = await prisma.userEvent.findMany({
    where: {
      action: "CLICK",
      createdAt: { gte: last7Days }
    }
  });

  const vendorClicks = clickEvents.filter(event => {
    const data = event.eventData as any;
    return data && (data.vendorId === vendorId || Number(data.vendorId) === vendorId);
  });

  const clicks = vendorClicks.length;

  // Calculate repeat orders (customers with more than one order with this vendor)
  const vendorOrders = await prisma.order.findMany({
    where: { vendorId },
    select: { userId: true, customerPhone: true }
  });

  const orderIdentifiers = new Set<string>();
  let repeatOrdersCount = 0;

  for (const o of vendorOrders) {
    const ident = o.userId ? `u:${o.userId}` : o.customerPhone ? `p:${o.customerPhone}` : null;
    if (ident) {
      if (orderIdentifiers.has(ident)) {
        repeatOrdersCount++;
      } else {
        orderIdentifiers.add(ident);
      }
    }
  }
  const repeatOrders = repeatOrdersCount;

  const complaints = await prisma.order.count({
    where: { vendorId, status: "FAILED" }
  });

  // Bot detection: Same IP clicking rapidly in the last 1 hour
  const last1Hour = new Date(Date.now() - 60 * 60 * 1000);
  const last1HourClicks = vendorClicks.filter(
    event => event.createdAt >= last1Hour && event.ipAddress !== null
  );

  const ipCounts: Record<string, number> = {};
  for (const event of last1HourClicks) {
    const ip = event.ipAddress!;
    ipCounts[ip] = (ipCounts[ip] || 0) + 1;
  }

  const maxSameIPClicks = Math.max(...Object.values(ipCounts), 0);

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