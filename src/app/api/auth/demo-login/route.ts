import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

const DEMO_ACCOUNTS: Record<string, { email: string; password: string }> = {
  trainer: { email: "m-kurokawa@fubic.com", password: "" }, // OTP only
  store: { email: "store@test.com", password: "test1234" },
  hr: { email: "hr@test.com", password: "test1234" },
  admin: { email: "admin@test.com", password: "test1234" },
};

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const role = searchParams.get("role");

  if (!role || !DEMO_ACCOUNTS[role]) {
    return NextResponse.json(
      { error: "Invalid role. Use: store, hr, admin" },
      { status: 400 }
    );
  }

  const account = DEMO_ACCOUNTS[role];

  if (!account.password) {
    return NextResponse.redirect(new URL("/login", origin));
  }

  try {
    // Create redirect response
    const redirectUrl =
      role === "store"
        ? "/store"
        : role === "hr"
          ? "/hr"
          : role === "admin"
            ? "/admin"
            : "/home";

    const redirectResponse = NextResponse.redirect(
      new URL(redirectUrl, origin)
    );

    // Create Supabase client that writes cookies to the response
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            const cookieHeader = request.headers.get("cookie") ?? "";
            return cookieHeader
              .split(";")
              .filter(Boolean)
              .map((c) => {
                const [name, ...rest] = c.trim().split("=");
                return { name, value: rest.join("=") };
              });
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              redirectResponse.cookies.set(name, value, options);
            });
          },
        },
      }
    );

    // Sign in with password
    const { error } = await supabase.auth.signInWithPassword({
      email: account.email,
      password: account.password,
    });

    if (error) {
      return NextResponse.redirect(
        new URL(`/login?error=${encodeURIComponent(error.message)}`, origin)
      );
    }

    return redirectResponse;
  } catch {
    return NextResponse.redirect(
      new URL("/login?error=server_error", origin)
    );
  }
}
