import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const year = searchParams.get("year");

  const categories = await prisma.budgetCategory.findMany({
    where: year ? { year: Number(year) } : undefined,
    include: {
      activities: {
        include: { entries: true },
      },
    },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(categories);
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role === "VIEWER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { name, code, year } = body;

  if (!name || !year) {
    return NextResponse.json({ error: "name dan year wajib diisi" }, { status: 400 });
  }

  const category = await prisma.budgetCategory.create({
    data: { name, code, year: Number(year) },
  });

  await logAudit({
    user: session.user as any,
    action: "CREATE",
    entity: "Pos Anggaran",
    label: `${category.name} (${category.year})`,
  });

  return NextResponse.json(category, { status: 201 });
}
