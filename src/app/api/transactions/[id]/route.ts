import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { syncRealisasiFromTransactions } from "@/lib/transactions";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role === "VIEWER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { date, description, amount } = body;

  if (!date || !description || amount === undefined || amount === null) {
    return NextResponse.json({ error: "date, description, dan amount wajib diisi" }, { status: 400 });
  }

  const transaction = await prisma.transaction.update({
    where: { id },
    data: { date: new Date(date), description, amount },
    include: { activity: true },
  });

  const total = await syncRealisasiFromTransactions(transaction.activityId, transaction.year);

  await logAudit({
    user: session.user as any,
    action: "UPDATE",
    entity: "Transaksi",
    label: `${transaction.activity.name} — ${description}`,
    detail: `Rp${Number(amount).toLocaleString("id-ID")} (total realisasi jadi Rp${Number(total).toLocaleString("id-ID")})`,
  });

  return NextResponse.json(transaction);
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const transaction = await prisma.transaction.delete({
    where: { id },
    include: { activity: true },
  });

  const total = await syncRealisasiFromTransactions(transaction.activityId, transaction.year);

  await logAudit({
    user: session.user as any,
    action: "DELETE",
    entity: "Transaksi",
    label: `${transaction.activity.name} — ${transaction.description}`,
    detail: `Rp${Number(transaction.amount).toLocaleString("id-ID")} (total realisasi jadi Rp${Number(total).toLocaleString("id-ID")})`,
  });

  return NextResponse.json({ success: true });
}
