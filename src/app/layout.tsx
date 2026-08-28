import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AnggaranHC — Monitoring Penyerapan Anggaran",
  description: "Monitoring penyerapan anggaran unit Human Capital",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body className="bg-slate-50 text-slate-800 antialiased">{children}</body>
    </html>
  );
}
