import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "NiceMaps",
  description: "Compose route maps for tour pages, client itineraries, decks, and proposals."
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
