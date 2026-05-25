import { jwtVerify } from "jose";
import { USER_ALLOWED_API_PATHS } from "@/lib/auth";

const encodedKey = new TextEncoder().encode(process.env.AUTH_SECRET!);
const COOKIE_NAME = "session";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ path: string[] }> }
) {
  return handleProxy(request, params);
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ path: string[] }> }
) {
  return handleProxy(request, params);
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ path: string[] }> }
) {
  return handleProxy(request, params);
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ path: string[] }> }
) {
  return handleProxy(request, params);
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

async function handleProxy(
  request: Request,
  params: Promise<{ path: string[] }>
) {
  const baseUrl = request.headers.get("X-Wx-Base-Url");
  if (!baseUrl) {
    return Response.json(
      { error: "X-Wx-Base-Url header is required" },
      { status: 400 }
    );
  }

  const { path } = await params;

  const session = await getSessionFromRequest(request);
  if (!session) {
    return Response.json(
      { error: "Not authenticated" },
      { status: 401 }
    );
  }

  if (
    session.role !== "admin" &&
    !USER_ALLOWED_API_PATHS.has(path[0])
  ) {
    return Response.json(
      { error: "Access denied. This API endpoint is not available for your role." },
      { status: 403 }
    );
  }

  const apiPath = path.join("/");
  const queryString = new URL(request.url).search;
  const url = `${baseUrl.replace(/\/+$/, "")}/${apiPath}${queryString}`;

  // Only forward safe headers
  const forwardHeaders = new Headers();
  const safeHeaders = ["content-type", "authorization", "accept"];
  request.headers.forEach((value, key) => {
    if (safeHeaders.includes(key.toLowerCase())) {
      forwardHeaders.set(key, value);
    }
  });

  try {
    const response = await fetch(url, {
      method: request.method,
      headers: forwardHeaders,
      body:
        request.method !== "GET" && request.method !== "HEAD"
          ? await request.text()
          : undefined,
    });

    // Strip Content-Encoding — fetch transparently decompresses, so the
    // header would claim gzip but the body is already plain, breaking the browser.
    const resHeaders = new Headers(response.headers);
    resHeaders.delete("content-encoding");

    return new Response(response.body, {
      status: response.status,
      headers: resHeaders,
    });
  } catch {
    return Response.json(
      { error: "Failed to reach the upstream API" },
      { status: 502 }
    );
  }
}