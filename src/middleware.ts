import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

// Public routes that don't require authentication
const PUBLIC_ROUTES = ["/login", "/register", "/auth/callback", "/auth/magic"];

// Role-based route prefixes
const ROLE_ROUTES: Record<string, string[]> = {
  trainer: ["/home", "/shifts", "/my-shifts", "/clock", "/earnings", "/profile", "/alerts"],
  store_manager: ["/store"],
  hr: ["/hr"],
  admin: ["/"], // admin can access everything
};

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip public routes
  if (PUBLIC_ROUTES.some((route) => pathname.startsWith(route))) {
    const { supabaseResponse } = await updateSession(request);
    return supabaseResponse;
  }

  // Check authentication
  const { user, supabaseResponse, supabase } = await updateSession(request);

  if (!user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirect", pathname);
    return NextResponse.redirect(url);
  }

  // Get user role from profiles table
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const role = profile?.role;

  // If no profile exists yet, redirect to register
  if (!role) {
    if (!pathname.startsWith("/register")) {
      const url = request.nextUrl.clone();
      url.pathname = "/register";
      return NextResponse.redirect(url);
    }
    return supabaseResponse;
  }

  // Role-based routing
  if (role === "admin") {
    // Admin can access everything
    return supabaseResponse;
  }

  // Check if trainer is accessing trainer routes
  if (role === "trainer") {
    // Root redirect is handled by page.tsx
    if (pathname === "/") {
      return supabaseResponse;
    }
    const allowedPrefixes = ROLE_ROUTES.trainer;
    if (!allowedPrefixes.some((prefix) => pathname.startsWith(prefix))) {
      const url = request.nextUrl.clone();
      url.pathname = "/home";
      return NextResponse.redirect(url);
    }
    return supabaseResponse;
  }

  // Check if store_manager is accessing store routes
  if (role === "store_manager") {
    if (pathname === "/store" || pathname.startsWith("/store/")) {
      return supabaseResponse;
    }
    const url = request.nextUrl.clone();
    url.pathname = "/store";
    return NextResponse.redirect(url);
  }

  // Check if hr is accessing hr routes
  if (role === "hr") {
    if (pathname === "/hr" || pathname.startsWith("/hr/")) {
      return supabaseResponse;
    }
    const url = request.nextUrl.clone();
    url.pathname = "/hr";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - images/ (public images)
     * - api/ (API routes)
     */
    "/((?!_next/static|_next/image|favicon.ico|images/|api/).*)",
  ],
};
