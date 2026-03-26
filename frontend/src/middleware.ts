import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getAuth } from "./lib/auth";

export const runtime = "nodejs";

export default async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const publicRoutes = [
    "/login",
    "/onboarding",
    "/api/auth",
    "/api/session/onboarding-status",
    "/api/internal",
    "/api/oauth-config/public",
  ];
  const isPublicRoute = publicRoutes.some((route) => pathname.startsWith(route));

  // Allow static files (images, fonts, etc.)
  const isStaticFile = pathname.match(/\.(ico|png|jpg|jpeg|gif|svg|webp|woff|woff2|ttf|eot)$/i);

  if (isPublicRoute || isStaticFile) {
    return NextResponse.next();
  }

  try {
    const auth = await getAuth();
    const session = await auth.api.getSession({ headers: request.headers });

    if (!session) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("from", pathname);
      return NextResponse.redirect(loginUrl);
    }
  } catch (error) {
    // Fail open if auth check fails (e.g. DB unreachable) —
    // the client-side AuthGuard will catch it on the next heartbeat.
    console.error("[middleware] Auth check failed, allowing request through:", error);
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
