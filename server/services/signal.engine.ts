// 🔥 DERIVED SIGNALS COMPUTATION (ML Foundation)
// Daily cron job to compute ML signals from raw user events

import { emitSignalsUpdate } from "../lib/realtime";
import { prisma } from '../storage';

export async function computeVendorSignals(vendorId: number): Promise<void> {
  // 🚨 SIGNAL DECAY: Only use recent data (7 days for freshness)
  const signalWindow = 7 * 24 * 60 * 60 * 1000; // 7 days
  const signalStart = new Date(Date.now() - signalWindow);

  // 1. Click-to-Order Conversion Rate
  const clicks = await prisma.userEvent.count({
    where: {
      vendorId,
      action: "CLICK",
      createdAt: { gte: signalStart }
    }
  });

  const orders = await prisma.userEvent.count({
    where: {
      vendorId,
      action: "ORDER",
      createdAt: { gte: signalStart }
    }
  });

  // 🚨 SIGNAL QUALITY CONTROL: Minimum threshold for reliability
  const MIN_CLICKS_FOR_SIGNAL = 10;
  const conversionRate = (clicks >= MIN_CLICKS_FOR_SIGNAL && clicks > 0) ? orders / clicks : 0;

  // 2. View-to-Click Rate (CTR) - only if enough views
  const views = await prisma.userEvent.count({
    where: {
      vendorId,
      action: "VIEW",
      createdAt: { gte: signalStart }
    }
  });

  const MIN_VIEWS_FOR_CTR = 20;
  const ctr = (views >= MIN_VIEWS_FOR_CTR && views > 0) ? clicks / views : 0;

  // 3. Repeat Purchase Rate - only if enough orders
  const repeatOrders = await prisma.userEvent.count({
    where: {
      vendorId,
      action: "REPEAT_ORDER",
      createdAt: { gte: signalStart }
    }
  });

  const totalOrders = orders + repeatOrders;
  const MIN_ORDERS_FOR_REPEAT = 5;
  const repeatRate = (totalOrders >= MIN_ORDERS_FOR_REPEAT && totalOrders > 0) ? repeatOrders / totalOrders : 0;

  // 4. Cart Abandonment Rate - only if enough cart actions
  const addToCarts = await prisma.userEvent.count({
    where: {
      vendorId,
      action: "ADD_TO_CART",
      createdAt: { gte: signalStart }
    }
  });

  const MIN_CART_ACTIONS = 5;
  const cartConversionRate = (addToCarts >= MIN_CART_ACTIONS && addToCarts > 0) ? orders / addToCarts : 0;
  const abandonmentRate = cartConversionRate > 0 ? 1 - cartConversionRate : 0;

  // Update vendor with computed signals (only if we have reliable data)
  if (conversionRate > 0 || ctr > 0) {
    await prisma.vendor.update({
      where: { id: vendorId },
      data: {
        conversionRate: Math.round(conversionRate * 100) / 100, // Round to 2 decimals
        // Store additional signals in meta or extend model later
      }
    });

    console.log(`📊 Computed reliable signals for vendor ${vendorId}:`, {
      conversionRate: Math.round(conversionRate * 100) / 100,
      ctr: Math.round(ctr * 100) / 100,
      repeatRate: Math.round(repeatRate * 100) / 100,
      abandonmentRate: Math.round(abandonmentRate * 100) / 100,
      dataQuality: clicks >= MIN_CLICKS_FOR_SIGNAL ? 'HIGH' : 'LOW'
    });

    // 🔥 REAL-TIME: Emit signals update
    const vendor = await prisma.vendor.findUnique({
      where: { id: vendorId },
      select: { districtId: true }
    });
    if (vendor) {
      emitSignalsUpdate(vendor.districtId, vendorId, {
        conversionRate: Math.round(conversionRate * 100) / 100,
        ctr: Math.round(ctr * 100) / 100,
        dataQuality: clicks >= MIN_CLICKS_FOR_SIGNAL ? 'HIGH' : 'LOW'
      });
    }
  } else {
    console.log(`⚠️ Insufficient data for vendor ${vendorId} signals (clicks: ${clicks}, views: ${views})`);
  }
}

export async function computeAllVendorSignals(): Promise<void> {
  console.log('🔄 Computing ML signals for all vendors...');

  const vendors = await prisma.vendor.findMany({
    select: { id: true }
  });

  let processed = 0;
  for (const vendor of vendors) {
    try {
      await computeVendorSignals(vendor.id);
      processed++;
    } catch (error) {
      console.error(`Failed to compute signals for vendor ${vendor.id}:`, error);
    }
  }

  console.log(`✅ Computed signals for ${processed}/${vendors.length} vendors`);
}
