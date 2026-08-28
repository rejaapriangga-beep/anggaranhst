import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/active-users — daftar user yang heartbeat-nya masih dalam 2 menit terakhir
const ACTIVE_WINDOW_MS = 2 * 60 * 1000;

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const since = new Date(Date.now() - ACTIVE_WINDOW_MS);
  const users = await prisma.user.findMany({
    where: { lastActiveAt: { gte: since } },
    select: { id: true, name: true, email: true, role: true, lastActiveAt: true },
    orderBy: { lastActiveAt: "desc" },
  });

  return NextResponse.json({ active_users: users });
}
