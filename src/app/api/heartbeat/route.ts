import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// POST /api/heartbeat — dipanggil berkala oleh client untuk menandai user masih aktif
export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await prisma.user.update({
    where: { id: (session.user as any).id },
    data: { lastActiveAt: new Date() },
  });

  return NextResponse.json({ ok: true });
}
