import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { syncRealisasiFromTransactions } from "@/lib/transactions";

// GET /api/transactions?activityId=&year= — daftar rincian transaksi realisasi
// untuk satu Sub-Kegiatan di satu tahun, terbaru duluan.
export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const activityId = searchParams.get("activityId");
  const year = searchParams.get("year");

  if (!activityId || !year) {
    return NextResponse.json({ error: "activityId dan year wajib diisi" }, { status: 400 });
  }

  const transactions = await prisma.transaction.findMany({
    where: { activityId, year: Number(year) },
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
  });

  return NextResponse.json(transactions);
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role === "VIEWER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { activityId, year, date, description, amount } = body;

  if (!activityId || !year || !date || !description || amount === undefined || amount === null) {
    return NextResponse.json(
      { error: "activityId, year, date, description, dan amount wajib diisi" },
      { status: 400 }
    );
  }

  const activity = await prisma.budgetActivity.findUnique({ where: { id: activityId } });
  if (!activity) {
    return NextResponse.json({ error: "Sub-Kegiatan tidak ditemukan" }, { status: 404 });
  }

  const transaction = await prisma.transaction.create({
    data: {
      activityId,
      year: Number(year),
      date: new Date(date),
      description,
      amount,
    },
  });

  const total = await syncRealisasiFromTransactions(activityId, Number(year));

  await logAudit({
    user: session.user as any,
    action: "CREATE",
    entity: "Transaksi",
    label: `${activity.name} — ${description}`,
    detail: `Rp${Number(amount).toLocaleString("id-ID")} (total realisasi jadi Rp${Number(total).toLocaleString("id-ID")})`,
  });

  return NextResponse.json(transaction, { status: 201 });
}
