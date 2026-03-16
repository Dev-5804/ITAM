import * as Sentry from "@sentry/nextjs";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    throw new Error("Sentry test error from /api/sentry-test");
  } catch (error) {
    Sentry.captureException(error);
    await Sentry.flush(2000);

    return NextResponse.json(
      {
        ok: false,
        message: "Sentry test event sent. Check your Sentry project events.",
      },
      { status: 500 }
    );
  }
}