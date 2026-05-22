import "server-only";

import { jwtVerify } from "jose";

const encodedKey = new TextEncoder().encode(process.env.AUTH_SECRET!);
const COOKIE_NAME = "session";

const REFUND_SUBMIT_API_TEST = process.env.REFUND_SUBMIT_API_TEST ?? "";
const REFUND_SUBMIT_API_UAT = process.env.REFUND_SUBMIT_API_UAT ?? "";

export async function POST(request: Request) {
  const env = request.headers.get("X-Env");
  const baseUrl = env === "uat" ? REFUND_SUBMIT_API_UAT : REFUND_SUBMIT_API_TEST;
  if (!baseUrl) {
    return Response.json(
      { error: "Refund submit API is not configured for the selected environment" },
      { status: 500 }
    );
  }

  const session = await getSessionFromRequest(request);
  if (!session) {
    return Response.json({ error: "Not authenticated" }, { status: 401 });
  }

  const url = new URL(request.url);
  const flowCode = url.searchParams.get("flowCode");
  if (!flowCode) {
    return Response.json({ error: "flowCode is required" }, { status: 400 });
  }

  const forwardCookie = request.headers.get("X-Forward-Cookie");
  const forwardHeaders = new Headers();
  if (forwardCookie) {
    forwardHeaders.set("Cookie", `SESSION=${forwardCookie}`);
  }
  const safeHeaders = ["accept", "content-type", "authorization"];
  request.headers.forEach((value, key) => {
    if (safeHeaders.includes(key.toLowerCase())) {
      forwardHeaders.set(key, value);
    }
  });

  try {
    const response = await fetch(`${baseUrl.replace(/\/+$/, "")}?flowCode=${encodeURIComponent(flowCode)}`, {
      method: "POST",
      headers: forwardHeaders,
    });

    const resHeaders = new Headers(response.headers);
    resHeaders.delete("content-encoding");

    return new Response(response.body, {
      status: response.status,
      headers: resHeaders,
    });
  } catch {
    return Response.json({ error: "Failed to reach the refund submit API" }, { status: 502 });
  }
}

async function getSessionFromRequest(
  request: Request
): Promise<{ username: string; role: string } | null> {
  const cookieHeader = request.headers.get("cookie");
  if (!cookieHeader) return null;

  const cookies = cookieHeader
    .split(";")
    .map((c) => c.trim())
    .reduce<Record<string, string>>((acc, pair) => {
      const eq = pair.indexOf("=");
      if (eq === -1) return acc;
      const key = pair.slice(0, eq).trim();
      const val = pair.slice(eq + 1).trim();
      if (key) acc[key] = val;
      return acc;
    }, {});
  const sessionCookie = cookies[COOKIE_NAME];
  if (!sessionCookie) return null;

  try {
    const { payload } = await jwtVerify<{ username: string; role: string }>(
      sessionCookie,
      encodedKey,
      { algorithms: ["HS256"] }
    );
    return payload;
  } catch {
    return null;
  }
}