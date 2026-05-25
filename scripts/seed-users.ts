import { MongoClient } from "mongodb";
import { hashPassword } from "../lib/password";

const MONGODB_URI = process.env.MONGODB_URI!;
if (!MONGODB_URI) {
  console.error("MONGODB_URI env var is required");
  process.exit(1);
}

const users = [
  { username: "admin", password: "123456", role: "admin" as const },
];

async function seed() {
  const client = new MongoClient(MONGODB_URI);
  const col = client.db("miniprogram_manager").collection("users");

  await col.createIndex({ username: 1 }, { unique: true });

  for (const u of users) {
    const hashed = await hashPassword(u.password);
    await col.updateOne(
      { username: u.username },
      { $set: { username: u.username, password: hashed, role: u.role, createdAt: new Date() } },
      { upsert: true }
    );
    console.log(`Upserted user: ${u.username} (${u.role})`);
  }

  await client.close();
  console.log("Done.");
}

seed().catch((e) => {
  console.error(e);
  process.exit(1);
});