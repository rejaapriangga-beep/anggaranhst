import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import bcrypt from "bcryptjs";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { name, email, password, role } = body;

  if (id === (session.user as any).id && role && role !== "ADMIN") {
    return NextResponse.json(
      { error: "Tidak bisa mengubah role diri sendiri dari ADMIN" },
      { status: 400 }
    );
  }

  const data: any = { name, email, role };
  if (password) {
    data.password = await bcrypt.hash(password, 10);
  }

  const user = await prisma.user.update({
    where: { id },
    data,
    select: { id: true, name: true, email: true, role: true, createdAt: true },
  });

  await logAudit({
    user: session.user as any,
    action: "UPDATE",
    entity: "User",
    label: `${user.name} (${user.email}) — role ${user.role}${password ? ", password diubah" : ""}`,
  });

  return NextResponse.json(user);
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (id === (session.user as any).id) {
    return NextResponse.json(
      { error: "Tidak bisa menghapus akun sendiri" },
      { status: 400 }
    );
  }

  const user = await prisma.user.delete({ where: { id } });

  await logAudit({
    user: session.user as any,
    action: "DELETE",
    entity: "User",
    label: `${user.name} (${user.email})`,
  });

  return NextResponse.json({ success: true });
}
