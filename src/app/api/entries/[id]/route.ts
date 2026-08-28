import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "Mei", "Jun",
  "Jul", "Agu", "Sep", "Okt", "Nov", "Des",
];

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role === "VIEWER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const entry = await prisma.budgetMonthlyEntry.update({
    where: { id },
    data: {
      paguBulan: body.paguBulan,
      komitmen: body.komitmen,
      realisasi: body.realisasi,
      status: body.status || undefined,
      note: body.note,
    },
    include: { activity: true },
  });

  await logAudit({
    user: session.user as any,
    action: "UPDATE",
    entity: "Realisasi Bulanan",
    label: `${entry.activity.name} — ${MONTHS[entry.month - 1]} ${entry.year}`,
  });

  return NextResponse.json(entry);
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const entry = await prisma.budgetMonthlyEntry.delete({
    where: { id },
    include: { activity: true },
  });

  await logAudit({
    user: session.user as any,
    action: "DELETE",
    entity: "Realisasi Bulanan",
    label: `${entry.activity.name} — ${MONTHS[entry.month - 1]} ${entry.year}`,
  });

  return NextResponse.json({ success: true });
}
