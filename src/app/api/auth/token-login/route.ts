import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const tokenHash = searchParams.get("token");

  if (!tokenHash) {
    return NextResponse.redirect(new URL("/login?error=missing_token", origin));
  }

  try {
    // Verify the magic link token server-side via Supabase REST API
    const verifyResponse = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/verify`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        },
        body: JSON.stringify({
          token_hash: tokenHash,
          type: "magiclink",
        }),
      }
    );

    if (!verifyResponse.ok) {
      return NextResponse.redirect(
        new URL("/login?error=invalid_token", origin)
      );
    }

    const session = await verifyResponse.json();

    if (!session.access_token || !session.refresh_token) {
      return NextResponse.redirect(
        new URL("/login?error=no_session", origin)
      );
    }

    // Create redirect response and set cookies on it
    const redirectResponse = NextResponse.redirect(new URL("/", origin));

    // Use createServerClient with cookie handlers that write to the redirect response
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            // Parse cookies from incoming request
            const cookieHeader = request.headers.get("cookie") ?? "";
            return cookieHeader.split(";").filter(Boolean).map((c) => {
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

    // This sets the session cookies on the redirect response
    await supabase.auth.setSession({
      access_token: session.access_token,
      refresh_token: session.refresh_token,
    });

    return redirectResponse;
  } catch {
    return NextResponse.redirect(
      new URL("/login?error=server_error", origin)
    );
  }
}
