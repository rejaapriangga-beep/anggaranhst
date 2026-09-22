"use client";

import { useEffect, useMemo, useState } from "react";
import Modal from "@/components/Modal";

export default function CategoriesPage() {
  const [categories, setCategories] = useState<any[]>([]);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [year, setYear] = useState(new Date().getFullYear());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [filterYear, setFilterYear] = useState<number | "">(new Date().getFullYear());

  const availableYears = useMemo(() => {
    const years = new Set(categories.map((c) => c.year));
    return Array.from(years).sort((a, b) => b - a);
  }, [categories]);

  const visibleCategories = useMemo(() => {
    if (filterYear === "") return categories;
    return categories.filter((c) => c.year === filterYear);
  }, [categories, filterYear]);

  async function load() {
    const res = await fetch("/api/categories");
    setCategories(await res.json());
  }

  useEffect(() => {
    load();
  }, []);

  function resetForm() {
    setName("");
    setCode("");
    setYear(new Date().getFullYear());
    setEditingId(null);
  }

  function openAdd() {
    resetForm();
    setModalOpen(true);
  }

  function startEdit(cat: any) {
    setEditingId(cat.id);
    setName(cat.name);
    setCode(cat.code ?? "");
    setYear(cat.year);
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    resetForm();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const payload = { name, code, year };

    if (editingId) {
      await fetch(`/api/categories/${editingId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } else {
      await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    }

    closeModal();
    load();
  }

  async function handleDelete(id: string) {
    if (!confirm("Hapus pos anggaran ini beserta seluruh sub-kegiatan & realisasinya?")) return;
    await fetch(`/api/categories/${id}`, { method: "DELETE" });
    load();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="text-xl font-semibold text-slate-800">Pos Anggaran</h1>
        <div className="flex items-end gap-3">
          <div>
            <label className="block text-xs text-slate-500 mb-1">Filter Tahun</label>
            <select
              value={filterYear}
              onChange={(e) => setFilterYear(e.target.value === "" ? "" : Number(e.target.value))}
              className="rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-800 bg-white"
            >
              <option value="">Semua Tahun</option>
              {availableYears.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <button onClick={openAdd} className="bg-[#6C5CE7] hover:bg-[#5842d6] text-white text-sm font-medium rounded-xl px-4 py-2">
            + Tambah Pos Anggaran
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-600 text-left">
            <tr>
              <th className="px-4 py-3">Kode</th>
              <th className="px-4 py-3">Nama</th>
              <th className="px-4 py-3">Tahun</th>
              <th className="px-4 py-3">Sub-Kegiatan</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {visibleCategories.map((cat) => (
              <tr key={cat.id} className="border-t border-slate-100">
                <td className="px-4 py-3 text-slate-500">{cat.code || "-"}</td>
                <td className="px-4 py-3 font-medium text-slate-800">{cat.name}</td>
                <td className="px-4 py-3">{cat.year}</td>
                <td className="px-4 py-3">{cat.activities?.length ?? 0}</td>
                <td className="px-4 py-3 text-right space-x-3">
                  <button onClick={() => startEdit(cat)} className="text-[#6C5CE7] hover:underline">Ubah</button>
                  <button onClick={() => handleDelete(cat.id)} className="text-red-600 hover:underline">Hapus</button>
                </td>
              </tr>
            ))}
            {visibleCategories.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-6 text-center text-slate-400">Belum ada pos anggaran{filterYear !== "" ? ` untuk tahun ${filterYear}` : ""}.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <Modal open={modalOpen} onClose={closeModal} title={editingId ? "Ubah Pos Anggaran" : "Tambah Pos Anggaran"}>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-xs text-slate-500 mb-1">Kode</label>
            <input value={code} onChange={(e) => setCode(e.target.value)} className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-800" />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Nama Pos Anggaran</label>
            <input required value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-800" />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Tahun</label>
            <input required type="number" value={year} onChange={(e) => setYear(Number(e.target.value))} className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-800" />
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
