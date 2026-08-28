"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";

const ACTION_LABEL: Record<string, { text: string; tone: string }> = {
  CREATE: { text: "Tambah", tone: "bg-green-100 text-green-700" },
  UPDATE: { text: "Ubah", tone: "bg-[#6C5CE7]/10 text-[#6C5CE7]" },
  DELETE: { text: "Hapus", tone: "bg-red-100 text-red-700" },
};

const formatDate = (iso: string) =>
  new Intl.DateTimeFormat("id-ID", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  }).format(new Date(iso));

export default function LogsPage() {
  const { data: session } = useSession();
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterEntity, setFilterEntity] = useState("");
  const [filterAction, setFilterAction] = useState("");

  const isAdmin = (session?.user as any)?.role === "ADMIN";

  useEffect(() => {
    if (!isAdmin) return;
    fetch("/api/audit-logs?limit=200")
      .then((r) => r.json())
      .then((data) => {
        setLogs(Array.isArray(data) ? data : []);
        setLoading(false);
      });
  }, [isAdmin]);

  const entities = Array.from(new Set(logs.map((l) => l.entity)));

  const filtered = logs.filter((l) => {
    if (filterEntity && l.entity !== filterEntity) return false;
    if (filterAction && l.action !== filterAction) return false;
    return true;
  });

  if (!isAdmin) {
    return (
      <div className="bg-white rounded-2xl shadow-sm p-6 text-sm text-slate-500">
        Hanya ADMIN yang dapat melihat log aktivitas.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-800">Log Aktivitas</h1>
        <p className="text-sm text-slate-500">Riwayat perubahan data oleh seluruh user (200 terbaru)</p>
      </div>

      <div className="flex flex-wrap gap-3">
        <select
          value={filterEntity}
          onChange={(e) => setFilterEntity(e.target.value)}
          className="rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-800"
        >
          <option value="">Semua Modul</option>
          {entities.map((e) => <option key={e} value={e}>{e}</option>)}
        </select>
        <select
          value={filterAction}
          onChange={(e) => setFilterAction(e.target.value)}
          className="rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-800"
        >
          <option value="">Semua Aksi</option>
          <option value="CREATE">Tambah</option>
          <option value="UPDATE">Ubah</option>
          <option value="DELETE">Hapus</option>
        </select>
      </div>

      {loading ? (
        <p className="text-sm text-slate-500">Memuat log...</p>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden border border-slate-100">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600 text-left">
              <tr>
                <th className="px-4 py-3">Waktu</th>
                <th className="px-4 py-3">User</th>
                <th className="px-4 py-3">Aksi</th>
                <th className="px-4 py-3">Modul</th>
                <th className="px-4 py-3">Objek</th>
                <th className="px-4 py-3">Detail</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((log) => {
                const info = ACTION_LABEL[log.action] || { text: log.action, tone: "bg-slate-100 text-slate-600" };
                return (
                  <tr key={log.id} className="border-t border-slate-100">
                    <td className="px-4 py-2.5 text-slate-500 whitespace-nowrap">{formatDate(log.createdAt)}</td>
                    <td className="px-4 py-2.5">
                      <div className="font-medium text-slate-800">{log.userName}</div>
                      <div className="text-xs text-slate-400">{log.userEmail}</div>
                    </td>
                    <td className="px-4 py-2.5">
                      <span className={`inline-block rounded-full px-2.5 py-1 text-xs font-medium ${info.tone}`}>
                        {info.text}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-slate-600">{log.entity}</td>
                    <td className="px-4 py-2.5 font-medium text-slate-800">{log.label}</td>
                    <td className="px-4 py-2.5 text-xs text-slate-500">{log.detail || "-"}</td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">Belum ada aktivitas tercatat.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
