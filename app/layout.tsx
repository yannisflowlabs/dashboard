import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Yannis.ai — Dashboard",
  description: "Business dashboard for AI & automation consulting",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" style={{ height: "100%" }}>
      <body style={{ height: "100%", display: "flex", flexDirection: "column" }}>
        {children}
      </body>
    </html>
  );
}
