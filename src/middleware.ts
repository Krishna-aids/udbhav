import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/jwt";

const protectedPagePrefixes = ["/board", "/dashboard"];
const protectedApiPrefixes = [
  "/api/tasks",
  "/api/import",
  "/api/board",
  "/api/comments",
  "/api/stats",
  "/api/activity",
  "/api/users",
  "/api/stream",
];

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const isProtectedPage = protectedPagePrefixes.some((prefix) => path.startsWith(prefix));
  const isProtectedApi = protectedApiPrefixes.some((prefix) => path.startsWith(prefix));

  if (!isProtectedPage && !isProtectedApi) {
    return NextResponse.next();
  }

  const token = request.cookies.get("token")?.value;
  const user = token ? await verifyToken(token) : null;

  if (user) {
    const headers = new Headers(request.headers);
    headers.set("x-user-id", user.id);
    headers.set("x-user-role", user.role);
    headers.set("x-user-name", user.name);
    return NextResponse.next({ request: { headers } });
  }

  if (isProtectedApi) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("next", path);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/board/:path*", "/dashboard/:path*", "/api/:path*"],
};
