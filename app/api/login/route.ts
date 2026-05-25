import { createSession } from "@/lib/session";
import { validateCredentials } from "@/lib/auth";
import { ensureIndexes } from "@/lib/mongodb";

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

  if (username.length > 50 || password.length > 128) {
    return Response.json({ error: "Invalid credentials" }, { status: 401 });
  }

  await ensureIndexes();

  const matched = await validateCredentials(username, password);
  if (!matched) {
    return Response.json({ error: "Invalid credentials" }, { status: 401 });
  }

  await createSession(matched.username, matched.role);
  return Response.json({ success: true });
}