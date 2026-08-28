import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "Mei", "Jun",
  "Jul", "Agu", "Sep", "Okt", "Nov", "Des",
];

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const activityId = searchParams.get("activityId");
  const year = searchParams.get("year");

  const entries = await prisma.budgetMonthlyEntry.findMany({
    where: {
      activityId: activityId ?? undefined,
      year: year ? Number(year) : undefined,
    },
    include: { activity: { include: { category: true } } },
    orderBy: [{ year: "asc" }, { month: "asc" }],
  });

  return NextResponse.json(entries);
}

// Input/edit realisasi bulanan. Pakai upsert supaya "input realisasi" bulan
// yang sama untuk sub-kegiatan yang sama otomatis update, bukan duplikat.
// paguBulan (Release Budget) bersifat OPSIONAL di sini: kalau tidak dikirim
// (misal dari halaman Input Realisasi yang cuma boleh isi Commitment/Realisasi/
// Status/Catatan), nilai paguBulan yang sudah ada di database TIDAK ditimpa.
// Hanya halaman Sub-Kegiatan (Kelola Pagu Bulanan) yang mengirim paguBulan.
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role === "VIEWER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { activityId, month, year, paguBulan, komitmen, realisasi, status, note } = body;

  if (!activityId || !month || !year) {
    return NextResponse.json(
      { error: "activityId, month, year wajib diisi" },
      { status: 400 }
    );
  }

  const existing = await prisma.budgetMonthlyEntry.findUnique({
    where: { activityId_month_year: { activityId, month: Number(month), year: Number(year) } },
  });

  const updateData: any = {};
  if (paguBulan !== undefined) updateData.paguBulan = paguBulan;
  if (komitmen !== undefined) updateData.komitmen = komitmen;
  if (realisasi !== undefined) updateData.realisasi = realisasi;
  if (status) updateData.status = status;
  if (note !== undefined) updateData.note = note;

  const entry = await prisma.budgetMonthlyEntry.upsert({
    where: {
      activityId_month_year: { activityId, month: Number(month), year: Number(year) },
    },
    update: updateData,
    create: {
      activityId,
      month: Number(month),
      year: Number(year),
      paguBulan: paguBulan ?? 0,
      komitmen: komitmen ?? 0,
      realisasi: realisasi ?? 0,
      status: status || "ON_PROGRESS",
      note,
    },
    include: { activity: true },
  });

  await logAudit({
    user: session.user as any,
    action: existing ? "UPDATE" : "CREATE",
    entity: "Realisasi Bulanan",
    label: `${entry.activity.name} — ${MONTHS[entry.month - 1]} ${entry.year}`,
    detail: `Pagu: Rp${Number(entry.paguBulan).toLocaleString("id-ID")}, Commitment: Rp${Number(entry.komitmen).toLocaleString("id-ID")}, Realisasi: Rp${Number(entry.realisasi).toLocaleString("id-ID")}, Status: ${entry.status}`,
  });

  return NextResponse.json(entry, { status: 201 });
}
