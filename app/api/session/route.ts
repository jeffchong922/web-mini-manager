import { verifySession } from "@/lib/session";

export async function GET() {
  const session = await verifySession();
  if (!session) {
    return Response.json({ error: "Not authenticated" }, { status: 401 });
  }
  return Response.json({
    username: session.username,
    role: session.role,
  });
}