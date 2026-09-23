"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { useState } from "react";
import Providers from "@/components/Providers";
import ActiveUsersBar from "@/components/ActiveUsersBar";
import WelcomeTutorial from "@/components/WelcomeTutorial";

const NAV = [
  { href: "/reports", label: "Dashboard", icon: "📊" },
  { href: "/categories", label: "Pos Anggaran", icon: "🗂️" },
  // Disembunyikan sementara dari menu -- Tambah/Ubah/Hapus Sub-Kegiatan sekarang
  // sudah bisa dilakukan langsung dari halaman Input Realisasi. Halaman & route-nya
  // masih ada (belum dihapus), tinggal hapus baris "hidden: true" ini untuk memunculkannya lagi.
  { href: "/activities", label: "Sub-Kegiatan", icon: "📌", hidden: true },
  { href: "/entries", label: "Input Realisasi", icon: "✏️" },
  { href: "/users", label: "Kelola User", icon: "👥", adminOnly: true },
  { href: "/logs", label: "Log Aktivitas", icon: "🕒", adminOnly: true },
  { href: "/panduan", label: "Panduan", icon: "📖" },
];

function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [mobileOpen, setMobileOpen] = useState(false);

  const visibleNav = NAV.filter((item) => !item.hidden && (!item.adminOnly || (session?.user as any)?.role === "ADMIN"));
  const initials = (session?.user?.name || session?.user?.email || "U").slice(0, 1).toUpperCase();

  function closeMobile() {
    setMobileOpen(false);
  }

  return (
    <div className="min-h-screen">
      {/* Top bar — menu utama, sekaligus brand + user, dipakai di semua ukuran layar */}
      <header className="fixed top-0 left-0 right-0 z-40 bg-[#1e1b3a] text-white shadow-sm">
        <div className="flex items-center gap-4 px-4 md:px-6 h-16">
          <span className="flex items-center gap-2 font-semibold text-white text-base shrink-0">
            <span className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#6C5CE7] to-[#FF8A5C] flex items-center justify-center text-sm">A</span>
            <span className="hidden sm:inline">AnggaranHC</span>
          </span>

          {/* Nav — horizontal di desktop, disembunyikan & dipindah ke dropdown mobile */}
          <nav className="hidden lg:flex items-center gap-1 flex-1 min-w-0">
            {visibleNav.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm whitespace-nowrap transition-colors ${
                    active
                      ? "bg-white text-[#1e1b3a] font-medium shadow"
                      : "text-slate-300 hover:bg-white/10"
                  }`}
                >
                  <span className="text-sm">{item.icon}</span>
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <div className="flex-1 lg:hidden" />

          {/* User info + keluar — desktop */}
          <div className="hidden md:flex items-center gap-3 shrink-0">
            <div className="text-right leading-tight">
              <p className="text-xs text-white truncate max-w-[160px]">{session?.user?.name || "Pengguna"}</p>
              <p className="text-[11px] text-slate-400 truncate max-w-[160px]">{session?.user?.email}</p>
            </div>
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#FF8A5C] to-[#6C5CE7] flex items-center justify-center text-white text-sm font-semibold shrink-0">
              {initials}
            </div>
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="text-xs text-slate-400 hover:text-white whitespace-nowrap"
            >
              Keluar
            </button>
          </div>

          {/* Hamburger — mobile & tablet (menu horizontal tidak muat) */}
          <button
            onClick={() => setMobileOpen(true)}
            aria-label="Buka menu"
            className="lg:hidden text-xl leading-none px-1 shrink-0"
          >
            ☰
          </button>
        </div>
      </header>

      {/* Dropdown menu mobile/tablet */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={closeMobile} />
          <div className="absolute top-0 right-0 bottom-0 w-72 bg-[#1e1b3a] text-slate-300 flex flex-col shadow-xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
              <span className="flex items-center gap-2 font-semibold text-white text-base">
                <span className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#6C5CE7] to-[#FF8A5C] flex items-center justify-center text-sm">A</span>
                AnggaranHC
              </span>
              <button onClick={closeMobile} className="text-slate-400 hover:text-white text-lg">✕</button>
            </div>
            <nav className="flex-1 px-3 py-3 space-y-1 overflow-y-auto">
              {visibleNav.map((item) => {
                const active = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={closeMobile}
                    className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-sm transition-colors ${
                      active
                        ? "bg-white text-[#1e1b3a] font-medium shadow-lg"
                        : "text-slate-300 hover:bg-white/5"
                    }`}
                  >
                    <span className="text-base">{item.icon}</span>
                    {item.label}
                  </Link>
                );
              })}
            </nav>
            <div className="px-4 py-5 mx-3 mb-3 rounded-2xl bg-white/5">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#FF8A5C] to-[#6C5CE7] flex items-center justify-center text-white text-sm font-semibold shrink-0">
                  {initials}
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-white truncate">{session?.user?.name || "Pengguna"}</p>
                  <p className="text-[11px] text-slate-400 truncate">{session?.user?.email}</p>
                </div>
              </div>
              <button
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="mt-3 text-xs text-slate-400 hover:text-white"
              >
                Keluar
              </button>
            </div>
          </div>
        </div>
      )}

      <main className="min-w-0 px-4 pb-10 md:px-8 md:pb-10 pt-20">{children}</main>
      <ActiveUsersBar />
      <WelcomeTutorial />
    </div>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <Providers>
      <Shell>{children}</Shell>
    </Providers>
  );
}
