import { NextResponse } from "next/server";
import { verifyQrToken } from "@/actions/qr";

/**
 * QR code verification endpoint
 * Called when store scans a trainer's QR code
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");

  if (!token) {
    return NextResponse.json(
      { success: false, error: "Missing token" },
      { status: 400 }
    );
  }

  const result = await verifyQrToken(token);

  if (!result.success) {
    return NextResponse.json(
      { success: false, error: result.error },
      { status: 400 }
    );
  }

  return NextResponse.json({
    success: true,
    data: result.data,
  });
}

export async function POST(request: Request) {
  const body = await request.json();
  const token = body.token;

  if (!token) {
    return NextResponse.json(
      { success: false, error: "Missing token" },
      { status: 400 }
    );
  }

  const result = await verifyQrToken(token);

  if (!result.success) {
    return NextResponse.json(
      { success: false, error: result.error },
      { status: 400 }
    );
  }

  return NextResponse.json({
    success: true,
    data: result.data,
  });
}
