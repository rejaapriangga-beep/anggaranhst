"use client";

import { useEffect, useMemo, useState } from "react";
import Modal from "@/components/Modal";

const rupiah = (n: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n);

// Format angka dengan pemisah ribuan titik untuk tampilan di input, contoh: 5000000 -> "5.000.000"
const formatThousands = (value: string) => {
  const digits = value.replace(/\D/g, "");
  if (!digits) return "";
  return new Intl.NumberFormat("id-ID").format(Number(digits));
};
const stripThousands = (value: string) => value.replace(/\D/g, "");

export default function ActivitiesPage() {
  const [activities, setActivities] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [name, setName] = useState("");
  const [pic, setPic] = useState("");
  const [totalPagu, setTotalPagu] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  async function load() {
    const [aRes, cRes] = await Promise.all([
      fetch("/api/activities"),
      fetch("/api/categories"),
    ]);
    setActivities(await aRes.json());
    setCategories(await cRes.json());
  }

  useEffect(() => {
    load();
  }, []);

  function resetForm() {
    setName("");
    setPic("");
    setTotalPagu("");
    setCategoryId("");
    setEditingId(null);
  }

  function openAdd() {
    resetForm();
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    resetForm();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const payload = { name, pic, totalPagu: Number(totalPagu), categoryId };

    if (editingId) {
      await fetch(`/api/activities/${editingId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } else {
      await fetch("/api/activities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    }

    closeModal();
    load();
  }

  async function handleDelete(id: string) {
    if (!confirm("Hapus sub-kegiatan ini beserta seluruh data realisasinya?")) return;
    await fetch(`/api/activities/${id}`, { method: "DELETE" });
    load();
  }

  function startEdit(act: any) {
    setEditingId(act.id);
    setName(act.name);
    setPic(act.pic ?? "");
    setTotalPagu(String(Math.round(Number(act.totalPagu))));
    setCategoryId(act.categoryId);
    setModalOpen(true);
  }

  function toggleExpand(id: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const grouped = useMemo(() => {
    const map = new Map<string, { category: any; items: any[] }>();
    activities.forEach((act) => {
      const catId = act.categoryId || "tanpa-kategori";
      if (!map.has(catId)) {
        map.set(catId, { category: act.category, items: [] });
      }
      map.get(catId)!.items.push(act);
    });
    return Array.from(map.values())
      .map((g) => ({ ...g, items: g.items.sort((a, b) => a.name.localeCompare(b.name)) }))
      .sort((a, b) => (a.category?.name || "").localeCompare(b.category?.name || ""));
  }, [activities]);

  function expandAll() {
    setExpandedIds(new Set(grouped.map((g) => g.category?.id).filter(Boolean)));
  }
  function collapseAll() {
    setExpandedIds(new Set());
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-800">Sub-Kegiatan / Proyek</h1>
        <div className="space-x-2">
          <button onClick={expandAll} className="text-sm bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-xl px-3 py-2 shadow-sm">Buka Semua</button>
          <button onClick={collapseAll} className="text-sm bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-xl px-3 py-2 shadow-sm">Tutup Semua</button>
          <button onClick={openAdd} className="bg-[#6C5CE7] hover:bg-[#5842d6] text-white text-sm font-medium rounded-xl px-4 py-2">
            + Tambah Sub-Kegiatan
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {grouped.map((g) => {
          const catId = g.category?.id || "tanpa-kategori";
          const expanded = expandedIds.has(catId);
          const totalPaguGroup = g.items.reduce((s, a) => s + Number(a.totalPagu), 0);
          return (
            <div key={catId} className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
              <button
                onClick={() => toggleExpand(catId)}
                title={expanded ? "Klik untuk tutup detail" : "Klik untuk buka detail sub-kegiatan"}
                className="w-full flex items-center justify-between px-4 py-3 bg-slate-100 hover:bg-slate-200/70 transition-colors text-left"
              >
                <span className="flex items-center gap-2 font-semibold text-slate-800 text-sm">
                  <span
                    className={`inline-flex items-center justify-center w-4 h-4 rounded border shrink-0 text-[11px] font-bold leading-none ${
                      expanded
                        ? "bg-[#6C5CE7] border-[#6C5CE7] text-white"
                        : "bg-white border-slate-300 text-slate-500"
                    }`}
                  >
                    {expanded ? "−" : "+"}
                  </span>
                  {g.category?.name || "Tanpa Kategori"}
                  <span className="text-xs font-normal text-slate-400">({g.items.length} sub-kegiatan)</span>
                </span>
                <span className="text-xs text-slate-500">
                  Total Pagu: <span className="font-medium text-slate-700">{rupiah(totalPaguGroup)}</span>
                </span>
              </button>

              {expanded && (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 text-slate-600 text-left border-b border-slate-100">
                      <th className="px-4 py-2.5 font-medium">Sub-Kegiatan</th>
                      <th className="px-4 py-2.5 font-medium w-24">Unit</th>
                      <th className="px-4 py-2.5 font-medium w-36">Total Pagu</th>
                      <th className="px-4 py-2.5 font-medium w-28"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {g.items.map((act) => (
                      <tr key={act.id} className="border-t border-slate-50 hover:bg-slate-50/70">
                        <td className="px-4 py-2.5 font-medium text-slate-800">{act.name}</td>
                        <td className="px-4 py-2.5">{act.pic || "-"}</td>
                        <td className="px-4 py-2.5">{rupiah(Number(act.totalPagu))}</td>
                        <td className="px-4 py-2.5 text-right space-x-3">
                          <button onClick={() => startEdit(act)} className="text-[#6C5CE7] hover:underline">Ubah</button>
                          <button onClick={() => handleDelete(act.id)} className="text-red-600 hover:underline">Hapus</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          );
        })}
        {grouped.length === 0 && (
          <div className="bg-white rounded-2xl shadow-sm p-8 text-center text-slate-400">
            Belum ada sub-kegiatan.
          </div>
        )}
      </div>

      <Modal open={modalOpen} onClose={closeModal} title={editingId ? "Ubah Sub-Kegiatan" : "Tambah Sub-Kegiatan"}>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-xs text-slate-500 mb-1">Pos Anggaran</label>
            <select required value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-800">
              <option value="">Pilih...</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name} ({c.year})</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Nama Sub-Kegiatan/Proyek</label>
            <input required value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-800" />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Unit</label>
            <select value={pic} onChange={(e) => setPic(e.target.value)} className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-800 bg-white">
              <option value="">Pilih...</option>
              <option value="HSTA">HSTA</option>
              <option value="HSTC">HSTC</option>
              <option value="HSTD">HSTD</option>
              <option value="HST.1">HST.1</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Total Pagu / RKAP (Rp)</label>
            <input
              required
              type="text"
              inputMode="numeric"
              value={formatThousands(totalPagu)}
              onChange={(e) => setTotalPagu(stripThousands(e.target.value))}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-800 text-right"
              placeholder="0"
            />
          </div>
          <div className="flex items-center justify-end gap-2 pt-2">
            <button type="button" onClick={closeModal} className="text-sm text-slate-500 px-3 py-2">Batal</button>
            <button type="submit" className="bg-[#6C5CE7] hover:bg-[#5842d6] text-white text-sm font-medium rounded-xl px-4 py-2">
              {editingId ? "Simpan" : "Tambah"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
