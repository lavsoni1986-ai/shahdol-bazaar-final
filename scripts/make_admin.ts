import 'dotenv/config';
import { db } from "../server/db";
import { users } from "../shared/schema";
import { eq } from "drizzle-orm";

async function makeAdmin(username) {
  console.log(`🔑 Promoting ${username} to Admin...`);
  try {
    const [updated] = await db.update(users)
      .set({ role: 'admin', isAdmin: true })
      .where(eq(users.username, username))
      .returning();
    
    if (updated) {
      console.log(`✅ Success! ${username} is now an Admin.`);
      console.table([{ id: updated.id, username: updated.username, role: updated.role, isAdmin: updated.isAdmin }]);
    } else {
      console.log(`❌ User "${username}" not found.`);
    }
  } catch (error) {
    console.error("❌ Failed to update user:", error);
  } finally {
    process.exit();
  }
}

const targetUsername = process.argv[2];
if (!targetUsername) {
  console.log("Please provide a username: npx tsx scripts/make_admin.ts <username>");
  process.exit();
}

makeAdmin(targetUsername);

