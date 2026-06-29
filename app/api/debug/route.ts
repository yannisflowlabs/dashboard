export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    DATABASE_URL: process.env.DATABASE_URL ? "SET (" + process.env.DATABASE_URL.slice(0, 20) + "...)" : "UNDEFINED",
    DATABASE_AUTH_TOKEN: process.env.DATABASE_AUTH_TOKEN ? "SET" : "UNDEFINED",
    CALCOM_API_KEY: process.env.CALCOM_API_KEY ? "SET" : "UNDEFINED",
    NODE_ENV: process.env.NODE_ENV,
  });
}
