import { deleteSession } from "@/lib/session";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  await deleteSession();
  const host = request.headers.get("host") || `localhost:${process.env.PORT || "3000"}`;
  const proto = request.headers.get("x-forwarded-proto") || "http";
  return NextResponse.redirect(new URL("/login", `${proto}://${host}`));
}
