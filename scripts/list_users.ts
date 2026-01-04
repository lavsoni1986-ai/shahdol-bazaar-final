import 'dotenv/config';
import { db } from "../server/db";
import { users } from "../shared/schema";

async function listUsers() {
  console.log("👥 Listing all users...");
  try {
    const allUsers = await db.select().from(users);
    console.table(allUsers.map(u => ({ id: u.id, username: u.username, role: u.role, isAdmin: u.isAdmin })));
  } catch (error) {
    console.error("❌ Failed to list users:", error);
  } finally {
    process.exit();
  }
}

listUsers();

