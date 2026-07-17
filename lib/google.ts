import { google } from "googleapis";
import { getPrisma } from "@/lib/prisma";

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID!;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET!;
const REDIRECT_URI =
  (process.env.NEXTAUTH_URL ?? "https://dashboard-hlot.vercel.app") +
  "/api/auth/google/callback";

export function createOAuthClient() {
  return new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);
}

export function getAuthUrl() {
  const client = createOAuthClient();
  return client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: [
      "https://www.googleapis.com/auth/drive.readonly",
      "https://www.googleapis.com/auth/documents.readonly",
      "https://www.googleapis.com/auth/calendar.readonly",
    ],
  });
}

// Retourne un client OAuth avec token rafraîchi si nécessaire
export async function getAuthenticatedClient() {
  const prisma = getPrisma();
  const stored = await prisma.googleToken.findUnique({ where: { id: 1 } });
  if (!stored) throw new Error("Google non connecté");

  const client = createOAuthClient();
  client.setCredentials({
    access_token: stored.accessToken,
    refresh_token: stored.refreshToken,
    expiry_date: stored.expiresAt.getTime(),
  });

  // Rafraîchit automatiquement si expiré
  if (stored.expiresAt < new Date()) {
    const { credentials } = await client.refreshAccessToken();
    await prisma.googleToken.update({
      where: { id: 1 },
      data: {
        accessToken: credentials.access_token!,
        expiresAt: new Date(credentials.expiry_date!),
      },
    });
    client.setCredentials(credentials);
  }

  return client;
}

// Vrai statut de connexion : vérifie que le token existe ET qu'il est encore
// utilisable (refresh réussi si expiré), pas juste qu'une ligne existe en base.
export async function isGoogleConnected(): Promise<boolean> {
  try {
    await getAuthenticatedClient();
    return true;
  } catch {
    return false;
  }
}
