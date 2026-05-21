import { createSession } from "@/lib/session";
import { parseUsers, findMatchingUser, type AuthUser } from "@/lib/auth";

export async function POST(request: Request) {
  let body: { username?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { username, password } = body;
  if (!username || !password) {
    return Response.json(
      { error: "Username and password are required" },
      { status: 400 }
    );
  }

  let users: AuthUser[] = [];
  const authUsersStr = process.env.AUTH_USERS;
  if (authUsersStr) {
    users = parseUsers(authUsersStr);
  }

  // Legacy fallback: single AUTH_USERNAME/AUTH_PASSWORD, role = admin
  if (users.length === 0) {
    const legacyUser = process.env.AUTH_USERNAME;
    const legacyPass = process.env.AUTH_PASSWORD;
    if (legacyUser && legacyPass) {
      users = [{ username: legacyUser, password: legacyPass, role: "admin" }];
    }
  }

  if (users.length === 0) {
    return Response.json(
      { error: "Server configuration error" },
      { status: 500 }
    );
  }

  const matched = findMatchingUser(users, username, password);
  if (!matched) {
    return Response.json({ error: "Invalid credentials" }, { status: 401 });
  }

  await createSession(matched.username, matched.role);
  return Response.json({ success: true });
}