import { prisma } from "./prisma";

type AuditAction = "CREATE" | "UPDATE" | "DELETE";

export async function logAudit({
  user,
  action,
  entity,
  label,
  detail,
}: {
  user: { id: string; name?: string | null; email?: string | null };
  action: AuditAction;
  entity: string;
  label: string;
  detail?: string;
}) {
  try {
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        userName: user.name || "-",
        userEmail: user.email || "-",
        action,
        entity,
        label,
        detail,
      },
    });
  } catch (e) {
    // Jangan sampai kegagalan logging menggagalkan operasi utama
    console.error("Gagal mencatat audit log:", e);
  }
}
