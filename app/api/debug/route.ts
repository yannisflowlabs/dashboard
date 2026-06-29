export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/prisma";

export async function GET() {
  const envCheck = {
    DATABASE_URL_value: process.env.DATABASE_URL ?? "UNDEFINED",
    DATABASE_URL_length: process.env.DATABASE_URL?.length ?? 0,
    DATABASE_AUTH_TOKEN: process.env.DATABASE_AUTH_TOKEN ? "SET" : "UNDEFINED",
    NODE_ENV: process.env.NODE_ENV,
  };

  let prismaTest: string;
  try {
    const p = getPrisma();
    const count = await p.callReview.count();
    prismaTest = `OK — ${count} reviews`;
  } catch (err) {
    prismaTest = `ERREUR: ${err instanceof Error ? err.message : String(err)}`;
  }

  return NextResponse.json({ envCheck, prismaTest });
}
