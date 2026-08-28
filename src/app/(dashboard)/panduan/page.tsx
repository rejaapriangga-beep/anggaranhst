"use client";

function Section({
  icon,
  title,
  adminOnly,
  children,
}: {
  icon: string;
  title: string;
  adminOnly?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 bg-[#1e1b3a]">
        <span className="text-base">{icon}</span>
        <h2 className="text-sm font-semibold text-white">{title}</h2>
        {adminOnly && (
          <span className="ml-auto text-[10px] font-medium bg-white/10 text-slate-200 rounded-full px-2 py-0.5">
            Khusus ADMIN
          </span>
        )}
      </div>
      <div className="px-4 py-4 text-sm text-slate-600 space-y-2">{children}</div>
    </div>
  );
}

function Step({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex gap-2">
      <span className="text-[#6C5CE7] shrink-0">•</span>
      <span>{children}</span>
    </li>
  );
}

export default function PanduanPage() {
  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-xl font-semibold text-slate-800">Panduan Penggunaan AnggaranHC</h1>
        <p className="text-sm text-slate-500">Ringkasan cara pakai tiap menu — bisa dibuka kapan saja lewat menu atas.</p>
      </div>

      <Section icon="📊" title="Dashboard (Laporan)">
        <ul className="space-y-1.5">
          <Step>Halaman pertama setelah login. Menampilkan ringkasan RKAP, Release Budget, Commitment, Realisasi, dan % Serap — per Pos Anggaran maupun total keseluruhan.</Step>
          <Step>Klik tanda <span className="font-bold">+</span> di baris Pos Anggaran untuk membuka rincian Sub-Kegiatan di bawahnya, klik <span className="font-bold">−</span> untuk menutup.</Step>
          <Step>Klik nama Sub-Kegiatan pada baris rincian → otomatis diarahkan ke halaman Input Realisasi, langsung scroll & highlight ke transaksi itu untuk diedit.</Step>
          <Step>Tombol <span className="font-medium text-slate-700">Export Excel</span> / <span className="font-medium text-slate-700">Export PDF</span> untuk mengunduh laporan lengkap.</Step>
        </ul>
      </Section>

      <Section icon="🗂️" title="Pos Anggaran">
        <ul className="space-y-1.5">
          <Step>Kelompok besar anggaran, contoh: "Alat Tulis Kantor (ATK)", "Belanja Pegawai".</Step>
          <Step>Tombol <span className="font-medium text-slate-700">+ Tambah Pos Anggaran</span> membuka popup untuk isi Kode, Nama, dan Tahun.</Step>
          <Step>Tombol <span className="text-[#6C5CE7] font-medium">Ubah</span> di tiap baris juga membuka popup, sudah terisi data yang ada.</Step>
        </ul>
      </Section>

      <Section icon="📌" title="Sub-Kegiatan">
        <ul className="space-y-1.5">
          <Step>Rincian kegiatan/proyek di bawah satu Pos Anggaran — punya Unit penanggung jawab dan Total Pagu (RKAP).</Step>
          <Step>Sama seperti Pos Anggaran, pakai popup Tambah/Ubah. Angka Total Pagu otomatis diberi titik ribuan saat diketik.</Step>
        </ul>
      </Section>

      <Section icon="✏️" title="Input Realisasi">
        <ul className="space-y-1.5">
          <Step>Tempat mencatat realisasi bulanan per Sub-Kegiatan: Release Budget, Commitment, Realisasi, Status (On Progress/Done), dan Catatan.</Step>
          <Step><span className="font-medium text-slate-700">Tersimpan otomatis</span> — begitu Anda pindah ke field lain (klik di luar) atau tekan Enter, tidak perlu tombol Simpan.</Step>
          <Step>Status di kolom terakhir tiap baris: <span className="text-green-600">✓ Tersimpan</span>, <span className="text-slate-400">Menyimpan…</span>, atau <span className="text-amber-500">Belum tersimpan</span>.</Step>
          <Step>Klik tanda <span className="font-bold">+</span>/<span className="font-bold">−</span> di judul Pos Anggaran untuk buka/tutup daftar sub-kegiatannya.</Step>
        </ul>
      </Section>

      <Section icon="👥" title="Kelola User" adminOnly>
        <ul className="space-y-1.5">
          <Step>Tambah, ubah, atau hapus akun user lewat popup.</Step>
          <Step>Role menentukan hak akses: <span className="font-medium">ADMIN</span> (akses penuh termasuk kelola user), <span className="font-medium">EDITOR</span> (bisa input & ubah data), <span className="font-medium">VIEWER</span> (lihat saja).</Step>
        </ul>
      </Section>

      <Section icon="🕒" title="Log Aktivitas" adminOnly>
        <ul className="space-y-1.5">
          <Step>Riwayat perubahan data — siapa mengubah apa dan kapan (Pos Anggaran, Sub-Kegiatan, Realisasi, User).</Step>
        </ul>
      </Section>

      <Section icon="🟢" title="Indikator User Aktif">
        <ul className="space-y-1.5">
          <Step>Bar tetap di bagian bawah layar menampilkan siapa saja yang sedang online di AnggaranHC saat ini.</Step>
          <Step>Arahkan kursor ke nama untuk lihat role dan waktu aktif terakhir.</Step>
        </ul>
      </Section>
    </div>
  );
}
