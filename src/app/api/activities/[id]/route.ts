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
  const activity = await prisma.budgetActivity.update({
    where: { id },
    data: {
      name: body.name,
      pic: body.pic,
      totalPagu: body.totalPagu,
    },
  });

  await logAudit({
    user: session.user as any,
    action: "UPDATE",
    entity: "Sub-Kegiatan",
    label: activity.name,
  });

  return NextResponse.json(activity);
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const activity = await prisma.budgetActivity.delete({ where: { id } });

  await logAudit({
    user: session.user as any,
    action: "DELETE",
    entity: "Sub-Kegiatan",
    label: activity.name,
  });

  return NextResponse.json({ success: true });
}
