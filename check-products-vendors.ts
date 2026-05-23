import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
    const products = await prisma.product.findMany({
        take: 20,
        select: {
            id: true,
            title: true,
            districtId: true,
            vendorId: true,
            approved: true,
            status: true,
            price: true,
        },
    });
    console.log("=== PRODUCTS ===");
    console.log(JSON.stringify(products, null, 2));

    const vendors = await prisma.vendor.findMany({
        take: 10,
        select: {
            id: true,
            name: true,
            slug: true,
            districtId: true,
            status: true,
            isShadowBanned: true,
        },
    });
    console.log("\n=== VENDORS ===");
    console.log(JSON.stringify(vendors, null, 2));

    const p3 = await prisma.product.findUnique({
        where: { id: 3 },
        select: {
            id: true,
            title: true,
            districtId: true,
            vendorId: true,
            approved: true,
            status: true,
            price: true,
        },
    });
    console.log("\n=== PRODUCT #3 ===");
    console.log(JSON.stringify(p3, null, 2));

    const rm = await prisma.vendor.findFirst({
        where: { slug: "rohitmobile" },
        select: {
            id: true,
            name: true,
            slug: true,
            districtId: true,
            status: true,
            isShadowBanned: true,
        },
    });
    console.log("\n=== VENDOR 'rohitmobile' ===");
    console.log(JSON.stringify(rm, null, 2));

    await prisma.$disconnect();
}

main().catch(console.error);
