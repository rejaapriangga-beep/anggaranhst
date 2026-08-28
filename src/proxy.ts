import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import type { NextRequest } from "next/server";

const PROTECTED = ["/categories", "/activities", "/entries", "/reports", "/users", "/logs", "/panduan"];

export async function proxy(req: NextRequest) {
  const isProtected = PROTECTED.some((path) => req.nextUrl.pathname.startsWith(path));
  if (!isProtected) return NextResponse.next();

  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token) {
    const loginUrl = new URL("/login", req.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/categories/:path*", "/activities/:path*", "/entries/:path*", "/reports/:path*", "/users/:path*", "/logs/:path*", "/panduan/:path*"],
};
