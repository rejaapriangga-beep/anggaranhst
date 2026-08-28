import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";

// Simpan transaksi tahunan (Commitment/Realisasi/Status/Catatan) untuk satu
// Sub-Kegiatan. Tidak ada lagi pemecahan per bulan — cukup 1 baris per
// activityId+year. Setiap kali disimpan, seluruh entri lama untuk
// activityId+year itu (termasuk sisa data bulanan lama) digabung jadi satu
// baris (month tetap disimpan sebagai 1, hanya sebagai penanda internal).
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role === "VIEWER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { activityId, year, paguBulan, komitmen, realisasi, status, note } = body;

  if (!activityId || !year) {
    return NextResponse.json({ error: "activityId dan year wajib diisi" }, { status: 400 });
  }

  const activity = await prisma.budgetActivity.findUnique({ where: { id: activityId } });
  if (!activity) {
    return NextResponse.json({ error: "Sub-Kegiatan tidak ditemukan" }, { status: 404 });
  }

  const result = await prisma.$transaction(async (tx) => {
    await tx.budgetMonthlyEntry.deleteMany({
      where: { activityId, year: Number(year) },
    });
    return tx.budgetMonthlyEntry.create({
      data: {
        activityId,
        month: 1,
        year: Number(year),
        paguBulan: paguBulan ?? 0, // Release Budget tahunan, diisi manual di Input Realisasi
        komitmen: komitmen ?? 0,
        realisasi: realisasi ?? 0,
        status: status || "ON_PROGRESS",
        note,
      },
    });
  });

  await logAudit({
    user: session.user as any,
    action: "UPDATE",
    entity: "Realisasi",
    label: `${activity.name} — Tahun ${year}`,
    detail: `Commitment: Rp${Number(result.komitmen).toLocaleString("id-ID")}, Realisasi: Rp${Number(result.realisasi).toLocaleString("id-ID")}, Status: ${result.status}`,
  });

  return NextResponse.json(result, { status: 201 });
}
