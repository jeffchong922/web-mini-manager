import "server-only";

import { jwtVerify } from "jose";

const encodedKey = new TextEncoder().encode(process.env.AUTH_SECRET!);
const COOKIE_NAME = "session";

const REFUND_QUERY_API_TEST = process.env.REFUND_QUERY_API_TEST ?? "";
const REFUND_QUERY_API_UAT = process.env.REFUND_QUERY_API_UAT ?? "";

export async function GET(request: Request) {
  const forwardCookie = request.headers.get("X-Forward-Cookie");
  if (!forwardCookie) {
    return Response.json({ error: "Cookie is required" }, { status: 400 });
  }

  const env = request.headers.get("X-Env");
  const baseUrl = env === "uat" ? REFUND_QUERY_API_UAT : REFUND_QUERY_API_TEST;
  if (!baseUrl) {
    return Response.json(
      { error: "Refund query API is not configured for the selected environment" },
      { status: 500 }
    );
  }

  const session = await getSessionFromRequest(request);
  if (!session) {
    return Response.json({ error: "Not authenticated" }, { status: 401 });
  }

  const url = new URL(request.url);
  const pageStr = url.searchParams.get("page");
  const limitStr = url.searchParams.get("limit");
  const page = pageStr ? parseInt(pageStr, 10) : 1;
  const limit = limitStr ? parseInt(limitStr, 10) : 10;

  if (isNaN(page) || page < 1 || isNaN(limit) || limit < 1) {
    return Response.json({ error: "page and limit must be positive integers" }, { status: 400 });
  }

  const params = new URLSearchParams();
  params.set("page", String(page));
  params.set("limit", String(limit));
  params.set("orderBy", "createTimeDesc")
  for (const key of ["activityCode", "mobile", "carLicenceNo", "wxUserOpenid", "appid"]) {
    const val = url.searchParams.get(key);
    if (val) params.set(key, val);
  }

  const apiUrl = `${baseUrl.replace(/\/+$/, "")}?${params.toString()}`;
  const cookieValue = `SESSION=${forwardCookie}`;

  const forwardHeaders = new Headers();
  forwardHeaders.set("Cookie", cookieValue);
  const safeHeaders = ["accept", "content-type", "authorization"];
  request.headers.forEach((value, key) => {
    if (safeHeaders.includes(key.toLowerCase())) {
      forwardHeaders.set(key, value);
    }
  });

  try {
    const response = await fetch(apiUrl, {
      method: "GET",
      headers: forwardHeaders,
    });

    const resHeaders = new Headers(response.headers);
    resHeaders.delete("content-encoding");

    return new Response(response.body, {
      status: response.status,
      headers: resHeaders,
    });
  } catch {
    return Response.json({ error: "Failed to reach the refund query API" }, { status: 502 });
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
