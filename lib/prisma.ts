import { PrismaClient } from "@/app/generated/prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import { createClient } from "@libsql/client";

function createPrismaClient(): PrismaClient {
  const url = process.env.DATABASE_URL;
  const authToken = process.env.DATABASE_AUTH_TOKEN;
  if (!url) throw new Error(`DATABASE_URL is not defined`);
  const libsql = createClient({ url, authToken });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const adapter = new PrismaLibSql(libsql as any);
  return new PrismaClient({ adapter });
}

// Pas de singleton global — nouveau client à chaque cold start
export function getPrisma(): PrismaClient {
  return createPrismaClient();
}
