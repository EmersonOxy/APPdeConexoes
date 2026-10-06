import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Conexões",
  description: "Conheça pessoas com mais contexto e respeito.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
