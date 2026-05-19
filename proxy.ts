import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const encodedKey = new TextEncoder().encode(process.env.AUTH_SECRET!);
const COOKIE_NAME = "session";

const PUBLIC_PATHS = ["/login", "/api/login"];

async function getSession(request: NextRequest) {
  const sessionCookie = request.cookies.get(COOKIE_NAME)?.value;
  if (!sessionCookie) return null;
  try {
    const { payload } = await jwtVerify<{ username: string }>(
      sessionCookie,
      encodedKey,
      { algorithms: ["HS256"] }
    );
    return payload;
  } catch {
    return null;
  }
}

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const session = await getSession(request);
  const isPublic = PUBLIC_PATHS.includes(pathname);

  if (isPublic && session) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  if (!isPublic && !session) {
    const redirectParam = pathname !== "/" ? `?redirect=${encodeURIComponent(pathname + search)}` : "";
    return NextResponse.redirect(new URL(`/login${redirectParam}`, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|ico|png)$).*)",
  ],
};
