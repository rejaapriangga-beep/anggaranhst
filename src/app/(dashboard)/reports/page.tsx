"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const rupiah = (n: number) =>
  new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 }).format(n);

const rupiahFull = (n: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n);

export default function ReportsPage() {
  const [categories, setCategories] = useState<any[]>([]);
  const [year] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(true);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetch(`/api/categories?year=${year}`)
      .then((r) => r.json())
      .then((data) => {
        const list = Array.isArray(data) ? data : [];
        setCategories(list);
        setExpandedIds(new Set()); // default semua collapse
        setLoading(false);
      });
  }, [year]);

  function toggleExpand(id: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function expandAll() {
    setExpandedIds(new Set(rows.map((r) => r.id)));
  }

  function collapseAll() {
    setExpandedIds(new Set());
  }

  // RKAP = totalPagu, Realisasi = jumlah realisasi, % Serap = Realisasi/RKAP, Sisa = RKAP - Realisasi
  const rows = categories.map((cat) => {
    const activities = cat.activities.map((act: any) => {
      const rkap = Number(act.totalPagu);
      const realisasi = act.entries.reduce((s: number, e: any) => s + Number(e.realisasi), 0);
      const sisa = rkap - realisasi;
      const pct = rkap > 0 ? (realisasi / rkap) * 100 : 0;
      return { id: act.id, name: act.name, pic: act.pic, rkap, realisasi, sisa, pct };
    });

    const catTotal = activities.reduce(
      (acc: any, a: any) => ({ rkap: acc.rkap + a.rkap, realisasi: acc.realisasi + a.realisasi, sisa: acc.sisa + a.sisa }),
      { rkap: 0, realisasi: 0, sisa: 0 }
    );

    return {
      id: cat.id,
      code: cat.code,
      name: cat.name,
      activities,
      ...catTotal,
      pct: catTotal.rkap > 0 ? (catTotal.realisasi / catTotal.rkap) * 100 : 0,
    };
  });

  const grandTotal = rows.reduce(
    (acc, r) => ({ rkap: acc.rkap + r.rkap, realisasi: acc.realisasi + r.realisasi, sisa: acc.sisa + r.sisa }),
    { rkap: 0, realisasi: 0, sisa: 0 }
  );
  const grandPct = grandTotal.rkap > 0 ? (grandTotal.realisasi / grandTotal.rkap) * 100 : 0;

  async function exportExcel() {
    const XLSX = await import("xlsx");
    const flat: any[] = [];
    rows.forEach((cat) => {
      flat.push({
        "Kode/Pos": cat.code || cat.name,
        Unit: "",
        RKAP: cat.rkap,
        Realisasi: cat.realisasi,
        "% Serap": cat.pct.toFixed(1),
        Sisa: cat.sisa,
      });
      cat.activities.forEach((a: any) => {
        flat.push({
          "Kode/Pos": "  " + a.name,
          Unit: a.pic || "",
          RKAP: a.rkap,
          Realisasi: a.realisasi,
          "% Serap": a.pct.toFixed(1),
          Sisa: a.sisa,
        });
      });
    });
    flat.push({
      "Kode/Pos": "TOTAL",
      Unit: "",
      RKAP: grandTotal.rkap,
      Realisasi: grandTotal.realisasi,
      "% Serap": grandPct.toFixed(1),
      Sisa: grandTotal.sisa,
    });
    const ws = XLSX.utils.json_to_sheet(flat);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Laporan");
    XLSX.writeFile(wb, `laporan-anggaran-${year}.xlsx`);
  }

  async function exportPdf() {
    const { default: jsPDF } = await import("jspdf");
    const autoTable = (await import("jspdf-autotable")).default;
    const doc = new jsPDF({ orientation: "landscape" });
    doc.setFontSize(14);
    doc.text(`Laporan Penyerapan Anggaran ${year}`, 14, 15);

    const body: any[] = [];
    rows.forEach((cat) => {
      body.push([
        { content: cat.name, styles: { fontStyle: "bold", fillColor: [241, 245, 249] } },
        "", rupiahFull(cat.rkap), rupiahFull(cat.realisasi), `${cat.pct.toFixed(1)}%`, rupiahFull(cat.sisa),
      ]);
      cat.activities.forEach((a: any) => {
        body.push([
          "  " + a.name, a.pic || "-", rupiahFull(a.rkap), rupiahFull(a.realisasi), `${a.pct.toFixed(1)}%`, rupiahFull(a.sisa),
        ]);
      });
    });
    body.push([
      { content: "TOTAL", styles: { fontStyle: "bold", fillColor: [219, 234, 254] } }, "",
      rupiahFull(grandTotal.rkap), rupiahFull(grandTotal.realisasi), `${grandPct.toFixed(1)}%`, rupiahFull(grandTotal.sisa),
    ]);

    autoTable(doc, {
      startY: 22,
      head: [["Pos Anggaran / Sub-Kegiatan", "Unit", "RKAP", "Realisasi", "% Serap", "Sisa"]],
      body,
      styles: { fontSize: 6.5 },
      headStyles: { fillColor: [30, 27, 58] },
    });
    doc.save(`laporan-anggaran-${year}.pdf`);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-800">Laporan Penyerapan Anggaran</h1>
          <p className="text-sm text-slate-500">Tahun {year} · Sub Division of Talent Management (HST)</p>
        </div>
        <div className="space-x-2">
          <button onClick={exportExcel} className="text-sm bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl px-3 py-2 shadow-sm">Export Excel</button>
          <button onClick={exportPdf} className="text-sm bg-red-600 hover:bg-red-700 text-white rounded-xl px-3 py-2 shadow-sm">Export PDF</button>
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-slate-500">Memuat data...</p>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <SummaryCard label="RKAP" value={rupiah(grandTotal.rkap)} />
            <SummaryCard label="Realisasi" value={rupiah(grandTotal.realisasi)} tone="green" />
            <SummaryCard label="% Serap" value={`${grandPct.toFixed(1)}%`} tone={grandPct >= 80 ? "green" : grandPct >= 50 ? "amber" : "red"} />
            <SummaryCard label="Sisa" value={rupiah(grandTotal.sisa)} tone="amber" />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-slate-400">
              Klik pada baris Pos Anggaran (tanda <span className="font-bold">+</span>) untuk melihat detail Sub-Kegiatan.
            </p>
            <div className="space-x-2">
              <button onClick={expandAll} className="text-sm bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-xl px-3 py-2 shadow-sm">Buka Semua</button>
              <button onClick={collapseAll} className="text-sm bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-xl px-3 py-2 shadow-sm">Tutup Semua</button>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm overflow-hidden border border-slate-100">
            <table className="w-full table-fixed text-xs">
              <colgroup>
                <col className="w-[35%]" />
                <col className="w-[10%]" />
                <col className="w-[16%]" />
                <col className="w-[16%]" />
                <col className="w-[10%]" />
                <col className="w-[13%]" />
              </colgroup>
              <thead>
                <tr className="bg-[#1e1b3a] text-slate-100 text-left">
                  <th className="px-2 py-3 font-medium">Pos Anggaran / Sub-Kegiatan</th>
                  <th className="px-2 py-3 font-medium text-center">User</th>
                  <th className="px-2 py-3 font-medium text-right">RKAP</th>
                  <th className="px-2 py-3 font-medium text-right">Realisasi</th>
                  <th className="px-2 py-3 font-medium text-right">% Serap</th>
                  <th className="px-2 py-3 font-medium text-right">Sisa</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((cat) => (
                  <RowGroup key={cat.id} cat={cat} rupiah={rupiah} expanded={expandedIds.has(cat.id)} onToggle={() => toggleExpand(cat.id)} year={year} />
                ))}
                {rows.length === 0 && (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">Belum ada data pos anggaran.</td></tr>
                )}
              </tbody>
              {rows.length > 0 && (
                <tfoot>
                  <tr className="bg-[#6C5CE7]/5 font-semibold text-slate-800 border-t-2 border-[#6C5CE7]/20">
                    <td className="px-2 py-3">TOTAL</td>
                    <td className="px-2 py-3"></td>
                    <td className="px-2 py-3 text-right truncate" title={rupiah(grandTotal.rkap)}>{rupiah(grandTotal.rkap)}</td>
                    <td className="px-2 py-3 text-right text-green-700 truncate" title={rupiah(grandTotal.realisasi)}>{rupiah(grandTotal.realisasi)}</td>
                    <td className="px-2 py-3 text-right">
                      <PctBadge pct={grandPct} />
                    </td>
                    <td className="px-2 py-3 text-right text-amber-700 truncate" title={rupiah(grandTotal.sisa)}>{rupiah(grandTotal.sisa)}</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </>
      )}
    </div>
  );
}

function RowGroup({ cat, rupiah, expanded, onToggle, year }: any) {
  const router = useRouter();
  return (
    <>
      <tr
        onClick={onToggle}
        title={expanded ? "Klik untuk tutup detail" : "Klik untuk buka detail sub-kegiatan"}
        className="bg-slate-100 font-semibold text-slate-800 border-t border-slate-200 cursor-pointer hover:bg-slate-200/70 transition-colors select-none"
      >
        <td className="px-2 py-2.5 truncate">
          <span className="inline-flex items-center gap-1.5 max-w-full">
            <span
              className={`inline-flex items-center justify-center w-4 h-4 rounded border shrink-0 text-[11px] font-bold leading-none ${
                expanded
                  ? "bg-[#6C5CE7] border-[#6C5CE7] text-white"
                  : "bg-white border-slate-300 text-slate-500"
              }`}
            >
              {expanded ? "−" : "+"}
            </span>
            <span className="break-words">
              {cat.code ? `${cat.code} · ` : ""}{cat.name}
            </span>
            <span className="text-xs font-normal text-slate-400 shrink-0">({cat.activities.length})</span>
          </span>
        </td>
        <td className="px-2 py-2.5"></td>
        <td className="px-2 py-2.5 text-right truncate" title={rupiah(cat.rkap)}>{rupiah(cat.rkap)}</td>
        <td className="px-2 py-2.5 text-right text-green-700 truncate" title={rupiah(cat.realisasi)}>{rupiah(cat.realisasi)}</td>
        <td className="px-2 py-2.5 text-right"><PctBadge pct={cat.pct} /></td>
        <td className="px-2 py-2.5 text-right text-amber-700 truncate" title={rupiah(cat.sisa)}>{rupiah(cat.sisa)}</td>
      </tr>
      {expanded && cat.activities.map((a: any) => (
        <tr
          key={a.id}
          onClick={() => router.push(`/entries?activityId=${a.id}&year=${year}`)}
          title="Klik untuk edit realisasi di Input Realisasi"
          className="border-t border-slate-50 hover:bg-[#6C5CE7]/5 cursor-pointer transition-colors"
        >
          <td className="px-2 py-2 pl-6 text-slate-600 align-top break-words">
            <span className="hover:underline">{a.name}</span>
          </td>
          <td className="px-2 py-2 text-slate-500 align-top text-center truncate">{a.pic || "-"}</td>
          <td className="px-2 py-2 text-right text-slate-600 align-top truncate" title={rupiah(a.rkap)}>{rupiah(a.rkap)}</td>
          <td className="px-2 py-2 text-right text-green-600 align-top truncate" title={rupiah(a.realisasi)}>{rupiah(a.realisasi)}</td>
          <td className="px-2 py-2 text-right align-top"><PctBadge pct={a.pct} small /></td>
          <td className="px-2 py-2 text-right text-amber-600 align-top truncate" title={rupiah(a.sisa)}>{rupiah(a.sisa)}</td>
        </tr>
      ))}
    </>
  );
}

function PctBadge({ pct, small }: { pct: number; small?: boolean }) {
  const tone = pct >= 80 ? "bg-green-100 text-green-700" : pct >= 50 ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700";
  return (
    <span className={`inline-block rounded-full font-medium ${tone} ${small ? "px-2 py-0.5 text-xs" : "px-2.5 py-1 text-xs"}`}>
      {pct.toFixed(1)}%
    </span>
  );
}

function SummaryCard({ label, value, tone }: { label: string; value: string; tone?: "blue" | "green" | "amber" | "red" | "purple" }) {
  const toneClass: Record<string, string> = {
    blue: "text-blue-700",
    green: "text-green-700",
    amber: "text-amber-700",
    red: "text-red-700",
    purple: "text-[#FF8A5C]",
  };
  const cls = tone ? toneClass[tone] : "text-slate-800";
  return (
    <div className="bg-white rounded-2xl shadow-sm p-4 border border-slate-100">
      <p className="text-xs text-slate-500">{label}</p>
      <p className={`text-lg font-semibold mt-1 ${cls}`}>{value}</p>
    </div>
  );
}
