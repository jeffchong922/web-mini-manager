import { NextRequest, NextResponse } from "next/server";
import { SignJWT, jwtVerify } from "jose";

const encodedKey = new TextEncoder().encode(process.env.AUTH_SECRET!);
const COOKIE_NAME = "session";
const MAX_AGE = 10800; // 3 hours

const PUBLIC_PATHS = ["/login", "/api/login"];

async function getSession(request: NextRequest) {
  const sessionCookie = request.cookies.get(COOKIE_NAME)?.value;
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

async function refreshJWT(payload: { username: string; role: string }) {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("3h")
    .sign(encodedKey);
}

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const session = await getSession(request);
  const isPublic = PUBLIC_PATHS.includes(pathname);

  if (isPublic && session) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  if (!isPublic && !session) {
    const redirectParam =
      pathname !== "/"
        ? `?redirect=${encodeURIComponent(pathname + search)}`
        : "";
    return NextResponse.redirect(
      new URL(`/login${redirectParam}`, request.url)
    );
  }

  const response = NextResponse.next();

  if (session) {
    const newToken = await refreshJWT(session);
    response.cookies.set(COOKIE_NAME, newToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: MAX_AGE,
      path: "/",
    });
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|ico|png)$).*)",
  ],
};
