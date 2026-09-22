import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Orçamentos | Panificadora Dreon",
  description: "Sistema interno de orçamentos da Panificadora Dreon.",
  other: { "codex-preview": "development" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="pt-BR"><body className="antialiased">{children}</body></html>;
}
