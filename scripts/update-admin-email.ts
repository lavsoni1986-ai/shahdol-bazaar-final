#!/usr/bin/env npx tsx
/**
 * 🛡️ BHARAT-OS: UPDATE ADMIN EMAIL SCRIPT
 * Purpose: Update Admin@lav email to shahdolbazaar2.0@gmail.com
 * This enables password resets and notifications to reach the correct inbox
 * Usage: npx tsx scripts/update-admin-email.ts
 */

import { prisma } from "../server/storage.js";

async function updateAdminEmail() {
    try {
        console.log("🔐 [IDENTITY GUARD] Starting Admin Email Update...\n");

        // Find Admin@lav user
        const adminUser = await prisma.user.findUnique({
            where: { username: "Admin@lav" }
        });

        if (!adminUser) {
            console.log("❌ [ERROR] Admin@lav user not found in database");
            process.exit(1);
        }

        console.log("📋 Current Admin Record:");
        console.log(`   ID: ${adminUser.id}`);
        console.log(`   Username: ${adminUser.username}`);
        console.log(`   Current Email: ${adminUser.email || "NOT SET"}`);
        console.log(`   Role: ${adminUser.role}`);
        console.log(`   Is Admin: ${adminUser.isAdmin}\n`);

        // Update email
        const updated = await prisma.user.update({
            where: { id: adminUser.id },
            data: {
                email: "shahdolbazaar2.0@gmail.com"
            }
        });

        console.log("✅ [SUCCESS] Admin email updated!\n");
        console.log("📧 New Contact Details:");
        console.log(`   Email: ${updated.email}`);
        console.log(`   Username (Login): ${updated.username}`);
        console.log(`   Role: ${updated.role}`);
        console.log(`   Admin Status: ${updated.isAdmin}\n`);
        console.log("🎯 All password resets & notifications will now reach: shahdolbazaar2.0@gmail.com\n");

    } catch (error) {
        console.error("🚨 [ERROR]:", error instanceof Error ? error.message : error);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

updateAdminEmail();

