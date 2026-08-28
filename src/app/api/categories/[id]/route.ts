import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role === "VIEWER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const category = await prisma.budgetCategory.update({
    where: { id },
    data: {
      name: body.name,
      code: body.code,
      year: body.year ? Number(body.year) : undefined,
    },
  });

  await logAudit({
    user: session.user as any,
    action: "UPDATE",
    entity: "Pos Anggaran",
    label: `${category.name} (${category.year})`,
  });

  return NextResponse.json(category);
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const category = await prisma.budgetCategory.delete({ where: { id } });

  await logAudit({
    user: session.user as any,
    action: "DELETE",
    entity: "Pos Anggaran",
    label: `${category.name} (${category.year})`,
  });

  return NextResponse.json({ success: true });
}
