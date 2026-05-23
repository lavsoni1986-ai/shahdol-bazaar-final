import { prisma } from "../storage";

export async function findPaymentById(id: number) {
  return prisma.payment.findUnique({ where: { id } });
}

export async function findPaymentByOrderId(orderId: string) {
  return prisma.payment.findUnique({ where: { orderId } });
}

export async function findPaymentByProviderId(providerId: string) {
  return prisma.payment.findFirst({ where: { orderId: providerId } });
}

export async function createPayment(data: any) {
  return prisma.payment.create({ data });
}

export async function upgradeUserSubscription(userId: number, userData: any, paymentData: any) {
  return prisma.$transaction([
    prisma.user.update({ where: { id: userId }, data: userData }),
    prisma.payment.create({ data: paymentData })
  ]);
}

export async function activateBoost(vendorId: number, vendorData: any, paymentData: any) {
  return prisma.$transaction([
    prisma.vendor.update({ where: { id: vendorId }, data: vendorData }),
    prisma.payment.create({ data: paymentData })
  ]);
}
