import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const categoryId = searchParams.get("categoryId");

  const activities = await prisma.budgetActivity.findMany({
    where: categoryId ? { categoryId } : undefined,
    include: { category: true, entries: true },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(activities);
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role === "VIEWER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { name, pic, totalPagu, categoryId } = body;

  if (!name || !totalPagu || !categoryId) {
    return NextResponse.json(
      { error: "name, totalPagu, dan categoryId wajib diisi" },
      { status: 400 }
    );
  }

  const activity = await prisma.budgetActivity.create({
    data: { name, pic, totalPagu, categoryId },
  });

  await logAudit({
    user: session.user as any,
    action: "CREATE",
    entity: "Sub-Kegiatan",
    label: activity.name,
  });

  return NextResponse.json(activity, { status: 201 });
}
