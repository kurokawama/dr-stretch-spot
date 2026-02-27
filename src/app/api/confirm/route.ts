import { NextResponse } from "next/server";
import { confirmPreDayAttendance } from "@/actions/matching";

/**
 * Pre-day confirmation endpoint
 * Called when trainer clicks OK button in reminder email
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const applicationId = searchParams.get("id");

  if (!applicationId) {
    return NextResponse.redirect(
      new URL("/login?error=missing_id", origin)
    );
  }

  const result = await confirmPreDayAttendance(applicationId);

  if (!result.success) {
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(result.error ?? "unknown")}`, origin)
    );
  }

  // Redirect to a confirmation page or home
  return NextResponse.redirect(
    new URL("/home?confirmed=true", origin)
  );
}
