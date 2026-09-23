"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { formatThousands, stripThousands } from "@/lib/format";
import { UNITS } from "@/lib/constants";
import Modal from "@/components/Modal";

const rupiah = (n: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n);

type RowState = {
  hasEntry: boolean;
  paguBulan: string;
  komitmen: string;
  realisasi: string;
  status: "ON_PROGRESS" | "DONE";
  note: string;
  dirty: boolean;
  saving: boolean;
};

const emptyRow = (): RowState => ({
  hasEntry: false,
  paguBulan: "",
  komitmen: "",
  realisasi: "",
  status: "ON_PROGRESS",
  note: "",
  dirty: false,
  saving: false,
});

function MiniPctBadge({ pct }: { pct: number }) {
  const tone = pct >= 80 ? "bg-green-100 text-green-700" : pct >= 50 ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700";
  return <span className={`inline-block rounded-full px-1.5 py-0.5 text-[11px] font-medium ${tone}`}>{pct.toFixed(0)}%</span>;
}

const UNIT_COLORS = [
  "bg-blue-100 text-blue-700",
  "bg-purple-100 text-purple-700",
  "bg-pink-100 text-pink-700",
  "bg-teal-100 text-teal-700",
  "bg-indigo-100 text-indigo-700",
  "bg-orange-100 text-orange-700",
  "bg-cyan-100 text-cyan-700",
  "bg-rose-100 text-rose-700",
];
function unitColor(unit: string) {
  if (!unit) return "bg-slate-100 text-slate-500";
  let hash = 0;
  for (let i = 0; i < unit.length; i++) hash = unit.charCodeAt(i) + ((hash << 5) - hash);
  return UNIT_COLORS[Math.abs(hash) % UNIT_COLORS.length];
}
function UnitBadge({ unit }: { unit?: string }) {
  if (!unit) return <span className="text-slate-400 text-xs">-</span>;
  return <span className={`inline-block rounded-full px-1.5 py-0.5 text-[11px] font-medium truncate max-w-full ${unitColor(unit)}`}>{unit}</span>;
}

// Rincian transaksi realisasi (banyak baris per Sub-Kegiatan per tahun) — jumlahnya
// disinkronkan server ke total Realisasi yang tampil di baris ringkasan.
function TransactionDetailModal({
  activity,
  year,
  onClose,
  onChanged,
}: {
  activity: { id: string; name: string };
  year: number;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");

  async function load() {
    setLoading(true);
    const res = await fetch(`/api/transactions?activityId=${activity.id}&year=${year}`);
    const data = await res.json();
    setTransactions(Array.isArray(data) ? data : []);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const total = transactions.reduce((s, t) => s + Number(t.amount), 0);

  function resetForm() {
    setEditingId(null);
    setDate(new Date().toISOString().slice(0, 10));
    setDescription("");
    setAmount("");
    setError("");
  }

  function startEdit(t: any) {
    setEditingId(t.id);
    setDate(new Date(t.date).toISOString().slice(0, 10));
    setDescription(t.description);
    setAmount(String(Math.round(Number(t.amount))));
    setError("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const payload = { activityId: activity.id, year, date, description, amount: Number(amount || 0) };

    const res = editingId
      ? await fetch(`/api/transactions/${editingId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
      : await fetch("/api/transactions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error || "Gagal menyimpan transaksi.");
      return;
    }

    resetForm();
    load();
    onChanged();
  }

  async function handleDelete(id: string) {
    if (!confirm("Hapus transaksi ini?")) return;
    const res = await fetch(`/api/transactions/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      alert(body.error || "Gagal menghapus transaksi. Hanya ADMIN yang boleh menghapus.");
      return;
    }
    load();
    onChanged();
  }

  return (
    <Modal open onClose={onClose} title={`Detail Transaksi — ${activity.name} (${year})`}>
      <div className="space-y-4">
        <form onSubmit={handleSubmit} className="space-y-2 border-b border-slate-100 pb-4">
          {error && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
              {error}
            </div>
          )}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs text-slate-500 mb-1">Tanggal</label>
              <input
                required
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-800"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Nominal (boleh minus untuk koreksi/retur)</label>
              <input
                required
                type="text"
                inputMode="numeric"
                value={formatThousands(amount)}
                onChange={(e) => setAmount(stripThousands(e.target.value))}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-800 text-right"
                placeholder="0"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Keterangan</label>
            <input
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-800"
              placeholder="mis. Pembayaran tiket batch 1"
            />
          </div>
          <div className="flex items-center justify-end gap-2 pt-1">
            {editingId && (
              <button type="button" onClick={resetForm} className="text-sm text-slate-500 px-3 py-2">Batal Ubah</button>
            )}
            <button type="submit" className="bg-[#6C5CE7] hover:bg-[#5842d6] text-white text-sm font-medium rounded-xl px-4 py-2">
              {editingId ? "Simpan Perubahan" : "+ Tambah Transaksi"}
            </button>
          </div>
        </form>

        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-500">Rincian Transaksi</span>
            <span className="text-sm font-semibold text-slate-800">Total: {rupiah(total)}</span>
          </div>
          {loading ? (
            <p className="text-sm text-slate-500">Memuat...</p>
          ) : transactions.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-4">Belum ada transaksi.</p>
          ) : (
            <div className="max-h-64 overflow-y-auto space-y-1.5">
              {transactions.map((t) => (
                <div key={t.id} className="flex items-center justify-between gap-2 border border-slate-100 rounded-xl px-3 py-2">
                  <div className="min-w-0">
                    <p className="text-sm text-slate-800 truncate">{t.description}</p>
                    <p className="text-xs text-slate-400">{new Date(t.date).toLocaleDateString("id-ID")}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-sm font-medium ${Number(t.amount) < 0 ? "text-red-600" : "text-slate-700"}`}>
                      {rupiah(Number(t.amount))}
                    </span>
                    <button onClick={() => startEdit(t)} className="text-xs text-[#6C5CE7] hover:underline">Ubah</button>
                    <button onClick={() => handleDelete(t.id)} className="text-xs text-red-600 hover:underline">Hapus</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}

// Tambah Sub-Kegiatan langsung dari header Pos Anggaran di halaman ini, tanpa
// pindah ke halaman Sub-Kegiatan. categoryId sudah pasti (dari Pos Anggaran yang diklik).
function AddActivityModal({
  category,
  onClose,
  onAdded,
}: {
  category: { id: string; name: string };
  onClose: () => void;
  onAdded: () => void;
}) {
  const [name, setName] = useState("");
  const [pic, setPic] = useState("");
  const [totalPagu, setTotalPagu] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const res = await fetch("/api/activities", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, pic, totalPagu: Number(totalPagu || 0), categoryId: category.id }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error || "Gagal menambah Sub-Kegiatan.");
      return;
    }

    onAdded();
    onClose();
  }

  return (
    <Modal open onClose={onClose} title={`Tambah Sub-Kegiatan — ${category.name}`}>
      <form onSubmit={handleSubmit} className="space-y-3">
        {error && (
          <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
            {error}
          </div>
        )}
        <div>
          <label className="block text-xs text-slate-500 mb-1">Nama Sub-Kegiatan/Proyek</label>
          <input
            required
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-800"
          />
        </div>
        <div>
          <label className="block text-xs text-slate-500 mb-1">Unit</label>
          <select value={pic} onChange={(e) => setPic(e.target.value)} className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-800 bg-white">
            <option value="">Pilih...</option>
            {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
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
          <button type="button" onClick={onClose} className="text-sm text-slate-500 px-3 py-2">Batal</button>
          <button type="submit" className="bg-[#6C5CE7] hover:bg-[#5842d6] text-white text-sm font-medium rounded-xl px-4 py-2">
            Tambah
          </button>
        </div>
      </form>
    </Modal>
  );
}

// Ubah/hapus Sub-Kegiatan langsung dari halaman ini (ikon pensil di tiap baris),
// tanpa pindah ke halaman Sub-Kegiatan.
function EditActivityModal({
  activity,
  onClose,
  onSaved,
}: {
  activity: { id: string; name: string; pic?: string | null; totalPagu: number | string };
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(activity.name);
  const [pic, setPic] = useState(activity.pic ?? "");
  const [totalPagu, setTotalPagu] = useState(String(Math.round(Number(activity.totalPagu))));
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const res = await fetch(`/api/activities/${activity.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, pic, totalPagu: Number(totalPagu || 0) }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error || "Gagal menyimpan perubahan.");
      return;
    }

    onSaved();
    onClose();
  }

  async function handleDelete() {
    if (!confirm(`Hapus Sub-Kegiatan "${activity.name}" beserta seluruh data realisasinya?`)) return;
    const res = await fetch(`/api/activities/${activity.id}`, { method: "DELETE" });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      alert(body.error || "Gagal menghapus Sub-Kegiatan. Hanya ADMIN yang boleh menghapus.");
      return;
    }
    onSaved();
    onClose();
  }

  return (
    <Modal open onClose={onClose} title="Ubah Sub-Kegiatan">
      <form onSubmit={handleSubmit} className="space-y-3">
        {error && (
          <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
            {error}
          </div>
        )}
        <div>
          <label className="block text-xs text-slate-500 mb-1">Nama Sub-Kegiatan/Proyek</label>
          <input
            required
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-800"
          />
        </div>
        <div>
          <label className="block text-xs text-slate-500 mb-1">Unit</label>
          <select value={pic} onChange={(e) => setPic(e.target.value)} className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-800 bg-white">
            <option value="">Pilih...</option>
            {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
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
        <div className="flex items-center justify-between gap-2 pt-2">
          <button type="button" onClick={handleDelete} className="text-sm text-red-600 hover:underline px-1 py-2">
            Hapus Sub-Kegiatan
          </button>
          <div className="flex items-center gap-2">
            <button type="button" onClick={onClose} className="text-sm text-slate-500 px-3 py-2">Batal</button>
            <button type="submit" className="bg-[#6C5CE7] hover:bg-[#5842d6] text-white text-sm font-medium rounded-xl px-4 py-2">
              Simpan
            </button>
          </div>
        </div>
      </form>
    </Modal>
  );
}

// Dibungkus Suspense karena useSearchParams() mewajibkannya untuk halaman yang di-prerender statis.
export default function EntriesPage() {
  return (
    <Suspense fallback={<p className="text-sm text-slate-500">Memuat...</p>}>
      <EntriesPageInner />
    </Suspense>
  );
}

function EntriesPageInner() {
  const searchParams = useSearchParams();
  // Datang dari link "klik sub-kegiatan" di halaman Laporan → langsung scroll & highlight baris itu.
  const targetActivityId = searchParams.get("activityId");

  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState(() => {
    const y = searchParams.get("year");
    return y ? Number(y) : new Date().getFullYear();
  });
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [rowState, setRowState] = useState<Record<string, RowState>>({});
  const [filterStatus, setFilterStatus] = useState<"" | "ON_PROGRESS" | "DONE">("");
  const [filterUnit, setFilterUnit] = useState("");
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const [detailActivity, setDetailActivity] = useState<{ id: string; name: string } | null>(null);
  const [addToCategory, setAddToCategory] = useState<{ id: string; name: string } | null>(null);
  const [editActivity, setEditActivity] = useState<any | null>(null);
  const rowRefs = useRef<Record<string, HTMLTableRowElement | null>>({});

  async function loadCategories() {
    setLoading(true);
    const res = await fetch("/api/categories");
    const data = await res.json();
    const list = Array.isArray(data) ? data : [];
    setCategories(list);
    setExpandedIds(new Set(list.map((c: any) => c.id)));
    setLoading(false);
  }

  useEffect(() => { loadCategories(); }, []);

  // Rekap semua entri (apapun sisa data bulan lama) jadi satu baris per sub-kegiatan per tahun
  useEffect(() => {
    const next: Record<string, RowState> = {};
    categories.forEach((cat) => {
      cat.activities.forEach((act: any) => {
        const entriesForYear = (act.entries || []).filter((e: any) => e.year === year);
        if (entriesForYear.length === 0) {
          next[act.id] = emptyRow();
        } else {
          const paguBulan = entriesForYear.reduce((s: number, e: any) => s + Number(e.paguBulan || 0), 0);
          const komitmen = entriesForYear.reduce((s: number, e: any) => s + Number(e.komitmen || 0), 0);
          const realisasi = entriesForYear.reduce((s: number, e: any) => s + Number(e.realisasi || 0), 0);
          const anyDone = entriesForYear.some((e: any) => e.status === "DONE");
          const note = entriesForYear.map((e: any) => e.note).filter(Boolean).join(" · ");
          next[act.id] = {
            hasEntry: true,
            paguBulan: String(paguBulan),
            komitmen: String(komitmen),
            realisasi: String(realisasi),
            status: anyDone ? "DONE" : "ON_PROGRESS",
            note,
            dirty: false,
            saving: false,
          };
        }
      });
    });
    setRowState(next);
  }, [categories, year]);

  // Scroll otomatis + highlight sementara ke baris yang ditunjuk dari halaman Laporan
  useEffect(() => {
    if (!targetActivityId || categories.length === 0) return;
    const el = rowRefs.current[targetActivityId];
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    setHighlightId(targetActivityId);
    const t = setTimeout(() => setHighlightId(null), 3000);
    return () => clearTimeout(t);
  }, [targetActivityId, categories]);

  function updateRow(activityId: string, patch: Partial<RowState>) {
    setRowState((prev) => ({
      ...prev,
      [activityId]: { ...prev[activityId], ...patch, dirty: true },
    }));
  }

  async function saveRow(activityId: string) {
    const row = rowState[activityId];
    if (!row || !row.dirty || row.saving) return;
    setRowState((prev) => ({ ...prev, [activityId]: { ...prev[activityId], saving: true } }));

    const res = await fetch("/api/entries/yearly", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        activityId,
        year,
        paguBulan: Number(row.paguBulan || 0),
        komitmen: Number(row.komitmen || 0),
        realisasi: Number(row.realisasi || 0),
        status: row.status,
        note: row.note,
      }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      alert(body.error || "Gagal menyimpan. Perubahan Anda TIDAK tersimpan.");
      setRowState((prev) => ({ ...prev, [activityId]: { ...prev[activityId], saving: false } }));
      return;
    }

    setRowState((prev) => ({
      ...prev,
      [activityId]: { ...prev[activityId], hasEntry: true, dirty: false, saving: false },
    }));
    loadCategories();
  }

  function toggleExpand(id: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  // Pos Anggaran dibuat per-tahun (BudgetCategory.year), jadi harus difilter sesuai
  // tahun yang dipilih — kalau tidak, Pos Anggaran tahun lain akan ikut tampil bercampur.
  const categoriesForYear = useMemo(() => categories.filter((cat) => cat.year === year), [categories, year]);

  // Termasuk beberapa tahun ke depan yang belum ada Pos Anggaran-nya sama sekali,
  // supaya tetap bisa dipilih waktu mulai input realisasi tahun anggaran baru.
  const yearOptions = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const years = new Set<number>(categories.map((c) => c.year));
    for (let y = currentYear - 1; y <= currentYear + 3; y++) years.add(y);
    years.add(year);
    return Array.from(years).sort((a, b) => b - a);
  }, [categories, year]);

  const allUnits = useMemo(() => {
    const set = new Set<string>();
    categoriesForYear.forEach((cat) => cat.activities.forEach((a: any) => { if (a.pic) set.add(a.pic); }));
    return Array.from(set).sort();
  }, [categoriesForYear]);

  const categorySummary = useMemo(() => {
    const map: Record<string, { pagu: number; realisasi: number; done: number; total: number }> = {};
    categoriesForYear.forEach((cat) => {
      let pagu = 0, realisasi = 0, done = 0;
      cat.activities.forEach((act: any) => {
        pagu += Number(act.totalPagu);
        const row = rowState[act.id];
        if (row) {
          realisasi += Number(row.realisasi || 0);
          if (row.status === "DONE") done += 1;
        }
      });
      map[cat.id] = { pagu, realisasi, done, total: cat.activities.length };
    });
    return map;
  }, [categoriesForYear, rowState]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-800">Input Realisasi</h1>
          <p className="text-sm text-slate-500">Realisasi dihitung otomatis dari Detail Transaksi · Pagu mengikuti RKAP · Status &amp; Catatan tersimpan otomatis · Klik judul Pos Anggaran (+) untuk buka/tutup</p>
        </div>
        <div className="flex gap-3">
          <div>
            <label className="block text-xs text-slate-500 mb-1">Filter Unit</label>
            <select value={filterUnit} onChange={(e) => setFilterUnit(e.target.value)} className="rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-800 bg-white">
              <option value="">Semua Unit</option>
              {allUnits.map((u) => <option key={u} value={u}>{u}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Filter Status</label>
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value as any)} className="rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-800 bg-white">
              <option value="">Semua Status</option>
              <option value="ON_PROGRESS">On Progress</option>
              <option value="DONE">Done</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Tahun</label>
            <select value={year} onChange={(e) => setYear(Number(e.target.value))} className="rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-800 bg-white">
              {yearOptions.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-slate-500">Memuat data...</p>
      ) : (
        <div className="space-y-4">
          {categoriesForYear.map((cat) => {
            const expanded = expandedIds.has(cat.id);
            const summary = categorySummary[cat.id] || { pagu: 0, realisasi: 0, done: 0, total: 0 };
            const summaryPct = summary.pagu > 0 ? (summary.realisasi / summary.pagu) * 100 : 0;
            const summarySisa = summary.pagu - summary.realisasi;
            const visibleActivities = cat.activities.filter((act: any) => {
              const statusOk = !filterStatus || (rowState[act.id]?.status || "ON_PROGRESS") === filterStatus;
              const unitOk = !filterUnit || act.pic === filterUnit;
              return statusOk && unitOk;
            });
            if ((filterStatus || filterUnit) && visibleActivities.length === 0) return null;

            return (
              <div key={cat.id} className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => toggleExpand(cat.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      toggleExpand(cat.id);
                    }
                  }}
                  title={expanded ? "Klik untuk tutup detail" : "Klik untuk buka detail sub-kegiatan"}
                  className="w-full flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 py-3 bg-[#1e1b3a] hover:bg-[#2a2650] transition-colors text-left cursor-pointer"
                >
                  <span className="flex items-center gap-2 font-semibold text-white text-sm">
                    <span
                      className={`inline-flex items-center justify-center w-4 h-4 rounded border shrink-0 text-[11px] font-bold leading-none ${
                        expanded
                          ? "bg-[#FF8A5C] border-[#FF8A5C] text-white"
                          : "bg-white/10 border-white/30 text-white"
                      }`}
                    >
                      {expanded ? "−" : "+"}
                    </span>
                    {cat.name}
                    <span className="text-xs font-normal text-slate-300">({summary.done}/{summary.total} selesai)</span>
                  </span>
                  <span className="flex flex-wrap items-center gap-x-3 gap-y-2">
                    <span className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-slate-300">
                      <span>RKAP: <span className="font-medium text-white">{rupiah(summary.pagu)}</span></span>
                      <span>Realisasi: <span className="font-medium text-green-400">{rupiah(summary.realisasi)}</span></span>
                      <span>% Serap: <span className="font-medium text-white">{summaryPct.toFixed(1)}%</span></span>
                      <span>Sisa: <span className="font-medium text-amber-300">{rupiah(summarySisa)}</span></span>
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setAddToCategory({ id: cat.id, name: cat.name });
                      }}
                      className="shrink-0 text-xs font-medium bg-white/10 hover:bg-white/20 text-white rounded-lg px-2.5 py-1.5"
                    >
                      + Tambah Sub-Kegiatan
                    </button>
                  </span>
                </div>

                {expanded && (
                  <table className="w-full table-fixed text-sm">
                    <colgroup>
                      <col className="w-[24%]" />
                      <col className="w-[8%]" />
                      <col className="w-[11%]" />
                      <col className="w-[13%]" />
                      <col className="w-[7%]" />
                      <col className="w-[12%]" />
                      <col className="w-[12%]" />
                      <col className="w-[13%]" />
                    </colgroup>
                    <thead>
                      <tr className="bg-slate-100 text-slate-600 text-left border-b border-slate-200">
                        <th className="px-2 py-2 font-medium">Sub-Kegiatan</th>
                        <th className="px-2 py-2 font-medium">Unit</th>
                        <th className="px-2 py-2 font-medium text-center">RKAP</th>
                        <th className="px-2 py-2 font-medium text-center">Realisasi</th>
                        <th className="px-2 py-2 font-medium text-center">Serap</th>
                        <th className="px-2 py-2 font-medium text-center">Sisa</th>
                        <th className="px-2 py-2 font-medium text-center">Status</th>
                        <th className="px-2 py-2 font-medium">Catatan</th>
                      </tr>
                    </thead>
                    <tbody>
                      {visibleActivities.map((act: any) => {
                        const row = rowState[act.id] || emptyRow();
                        const rkap = Number(act.totalPagu);
                        const realisasi = Number(row.realisasi || 0);
                        const pct = rkap > 0 ? (realisasi / rkap) * 100 : 0;
                        const sisa = rkap - realisasi;
                        const isHighlighted = highlightId === act.id;
                        return (
                          <tr
                            key={act.id}
                            ref={(el) => { rowRefs.current[act.id] = el; }}
                            className={`border-t border-slate-50 transition-colors duration-500 ${
                              isHighlighted ? "bg-amber-50 ring-2 ring-inset ring-[#6C5CE7]" : "hover:bg-slate-50/50"
                            }`}
                          >
                            <td className="px-2 py-1.5 text-slate-700 align-top">
                              <div className="flex items-start justify-between gap-1">
                                <span className="line-clamp-2 text-xs" title={act.name}>{act.name}</span>
                                <button
                                  onClick={() => setEditActivity(act)}
                                  title="Ubah Sub-Kegiatan"
                                  className="shrink-0 text-slate-400 hover:text-[#6C5CE7] p-0.5"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
                                    <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793 3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                                  </svg>
                                </button>
                              </div>
                              <button
                                onClick={() => setDetailActivity({ id: act.id, name: act.name })}
                                className="block text-[10px] text-[#6C5CE7] hover:underline mt-0.5"
                              >
                                Detail Transaksi{act._count?.transactions ? ` (${act._count.transactions})` : ""}
                              </button>
                            </td>
                            <td className="px-2 py-1.5 align-top">
                              <UnitBadge unit={act.pic} />
                            </td>
                            <td className="px-2 py-1.5 align-top">
                              <span className="block text-center text-slate-500 text-xs py-1.5 truncate" title={rupiah(rkap)}>{rupiah(rkap)}</span>
                            </td>
                            <td className="px-2 py-1.5 align-top">
                              <span
                                className={`block text-center text-xs font-medium py-1.5 truncate ${realisasi < 0 ? "text-red-600" : "text-slate-800"}`}
                                title={rupiah(realisasi)}
                              >
                                {rupiah(realisasi)}
                              </span>
                            </td>
                            <td className="px-2 py-1.5 text-center">
                              <MiniPctBadge pct={pct} />
                            </td>
                            <td className="px-2 py-1.5 text-center text-xs text-slate-600 truncate" title={rupiah(sisa)}>
                              {rupiah(sisa)}
                            </td>
                            <td className="px-2 py-1.5">
                              <select
                                value={row.status}
                                onChange={(e) => updateRow(act.id, { status: e.target.value as any })}
                                onBlur={() => saveRow(act.id)}
                                className={`w-full min-w-0 rounded-lg border px-1 py-1.5 text-[11px] font-medium text-center ${
                                  row.status === "DONE"
                                    ? "bg-green-50 border-green-200 text-green-700"
                                    : "bg-amber-50 border-amber-200 text-amber-700"
                                }`}
                              >
                                <option value="ON_PROGRESS">On Progress</option>
                                <option value="DONE">Done</option>
                              </select>
                            </td>
                            <td className="px-2 py-1.5">
                              <input
                                value={row.note}
                                onChange={(e) => updateRow(act.id, { note: e.target.value })}
                                onBlur={() => saveRow(act.id)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    e.preventDefault();
                                    e.currentTarget.blur();
                                  }
                                }}
                                className="w-full min-w-0 rounded-lg border border-slate-300 px-1.5 py-1.5 text-xs text-slate-800"
                                placeholder="-"
                              />
                            </td>
                          </tr>
                        );
                      })}
                      {visibleActivities.length === 0 && (
                        <tr><td colSpan={8} className="px-4 py-6 text-center text-slate-400">Belum ada sub-kegiatan di pos ini.</td></tr>
                      )}
                    </tbody>
                  </table>
                )}
              </div>
            );
          })}
          {categoriesForYear.length === 0 && (
            <div className="bg-white rounded-2xl shadow-sm p-8 text-center text-slate-400">
              Belum ada Pos Anggaran untuk tahun {year}. Tambahkan dulu di halaman Pos Anggaran.
            </div>
          )}
        </div>
      )}

      {detailActivity && (
        <TransactionDetailModal
          activity={detailActivity}
          year={year}
          onClose={() => setDetailActivity(null)}
          onChanged={loadCategories}
        />
      )}

      {addToCategory && (
        <AddActivityModal
          category={addToCategory}
          onClose={() => setAddToCategory(null)}
          onAdded={loadCategories}
        />
      )}

      {editActivity && (
        <EditActivityModal
          activity={editActivity}
          onClose={() => setEditActivity(null)}
          onSaved={loadCategories}
        />
      )}
    </div>
  );
}
