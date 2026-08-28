"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";

const STORAGE_KEY_PREFIX = "anggaranhc-tutorial-seen-v1:";

// Popup panduan singkat yang muncul otomatis sekali di login pertama (per user, per browser).
// Setelah ditutup, tidak muncul lagi otomatis — tapi panduan lengkap tetap bisa dibuka lewat menu "Panduan".
export default function WelcomeTutorial() {
  const { data: authSession, status } = useSession();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (status !== "authenticated" || !authSession?.user?.email) return;
    const key = STORAGE_KEY_PREFIX + authSession.user.email;
    try {
      if (!localStorage.getItem(key)) setOpen(true);
    } catch {
      // localStorage tidak tersedia (mis. mode private ketat) — lewati saja, jangan crash.
    }
  }, [status, authSession]);

  function dismiss() {
    setOpen(false);
    try {
      if (authSession?.user?.email) {
        localStorage.setItem(STORAGE_KEY_PREFIX + authSession.user.email, "1");
      }
    } catch {}
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4" onClick={dismiss}>
      <div
        className="bg-white rounded-2xl shadow-lg max-w-md w-full p-6 max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 mb-1">
          <span className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#6C5CE7] to-[#FF8A5C] flex items-center justify-center text-white font-semibold">A</span>
          <h2 className="text-lg font-semibold text-slate-800">Selamat datang di AnggaranHC 👋</h2>
        </div>
        <p className="text-sm text-slate-500 mb-4">Sekilas cara pakai sebelum mulai:</p>

        <ul className="space-y-3 text-sm text-slate-600 mb-5">
          <li className="flex gap-2.5">
            <span className="text-base shrink-0">📊</span>
            <span><span className="font-medium text-slate-800">Dashboard</span> — ringkasan penyerapan anggaran. Klik <span className="font-bold">+</span> untuk buka rincian, klik nama sub-kegiatan untuk langsung edit realisasinya.</span>
          </li>
          <li className="flex gap-2.5">
            <span className="text-base shrink-0">🗂️📌</span>
            <span><span className="font-medium text-slate-800">Pos Anggaran &amp; Sub-Kegiatan</span> — kelola lewat popup Tambah/Ubah.</span>
          </li>
          <li className="flex gap-2.5">
            <span className="text-base shrink-0">✏️</span>
            <span><span className="font-medium text-slate-800">Input Realisasi</span> — tersimpan otomatis saat pindah field atau tekan Enter, tidak perlu tombol Simpan.</span>
          </li>
        </ul>

        <div className="flex items-center justify-between gap-2">
          <Link href="/panduan" onClick={dismiss} className="text-sm text-[#6C5CE7] hover:underline">
            Lihat panduan lengkap →
          </Link>
          <button
            onClick={dismiss}
            className="bg-[#6C5CE7] hover:bg-[#5842d6] text-white text-sm font-medium rounded-xl px-4 py-2"
          >
            Mengerti, mulai pakai
          </button>
        </div>
      </div>
    </div>
  );
}
