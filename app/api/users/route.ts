import { verifySession } from "@/lib/session";
import { getUsersCollection } from "@/lib/mongodb";
import { hashPassword } from "@/lib/password";
import type { UserRole } from "@/types/auth";

async function requireAdmin() {
  const session = await verifySession();
  if (!session || session.role !== "admin") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }
  return session;
}

export async function GET() {
  const session = await requireAdmin();
  if (session instanceof Response) return session;

  const users = await getUsersCollection();
  const all = await users.find({}, { projection: { password: 0 } }).toArray();
  return Response.json(all);
}

export async function POST(request: Request) {
  const session = await requireAdmin();
  if (session instanceof Response) return session;

  let body: { username?: string; password?: string; role?: UserRole };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { username, password, role } = body;
  if (!username || !password || !role) {
    return Response.json(
      { error: "username, password, role are required" },
      { status: 400 }
    );
  }
  if (username.length < 2 || username.length > 50) {
    return Response.json({ error: "username must be 2-50 characters" }, { status: 400 });
  }
  if (password.length < 6 || password.length > 128) {
    return Response.json({ error: "password must be 6-128 characters" }, { status: 400 });
  }
  if (role !== "admin" && role !== "user") {
    return Response.json({ error: "role must be admin or user" }, { status: 400 });
  }

  const users = await getUsersCollection();
  const existing = await users.findOne({ username }, { projection: { _id: 1 } });
  if (existing) {
    return Response.json({ error: "Username already exists" }, { status: 409 });
  }

  const hashed = await hashPassword(password);
  await users.insertOne({
    username,
    password: hashed,
    role,
    createdAt: new Date(),
  });

  return Response.json({ success: true });
}

export async function DELETE(request: Request) {
  const session = await requireAdmin();
  if (session instanceof Response) return session;

  const { searchParams } = new URL(request.url);
  const username = searchParams.get("username");
  if (!username) {
    return Response.json({ error: "username is required" }, { status: 400 });
  }

  if (username === session.username) {
    return Response.json({ error: "Cannot delete yourself" }, { status: 400 });
  }

  const users = await getUsersCollection();
  await users.deleteOne({ username });
  return Response.json({ success: true });
}