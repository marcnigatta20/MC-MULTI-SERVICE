import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { ROLE_ROUTE_ACCESS, getRoleDashboardPath } from "@/lib/access";

const PUBLIC_ROUTES = ["/login", "/auth/reset-password", "/auth/callback"];

export async function proxy(request: NextRequest) {
  const { supabaseResponse, user, supabase } = await updateSession(request);
  const pathname = request.nextUrl.pathname;

  if (PUBLIC_ROUTES.some((route) => pathname.startsWith(route))) {
    if (user && pathname === "/login") {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      if (profile) {
        return NextResponse.redirect(
          new URL(getRoleDashboardPath(profile.role) || "/dashboard", request.url)
        );
      }
    }
    return supabaseResponse;
  }

  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const matchedRoute = Object.keys(ROLE_ROUTE_ACCESS)
    .sort((a, b) => b.length - a.length)
    .find((route) => pathname === route || pathname.startsWith(`${route}/`));

  if (matchedRoute) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, is_active")
      .eq("id", user.id)
      .single();

    if (!profile?.is_active) {
      return NextResponse.redirect(new URL("/login?error=inactive", request.url));
    }

    const allowedRoles = ROLE_ROUTE_ACCESS[matchedRoute];
    if (!allowedRoles.includes(profile.role) && profile.role !== "ADMIN") {
      return NextResponse.redirect(
        new URL(getRoleDashboardPath(profile.role) || "/login", request.url)
      );
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
