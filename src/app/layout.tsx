import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Michbenia — créateurs UGC IA",
  description: "Avatars IA, vidéos UGC et publication automatique sur TikTok et Instagram.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
