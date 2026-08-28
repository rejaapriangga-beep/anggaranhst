import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Endpoint publik ringan untuk ditampilkan di portal (hst.web.id), tanpa auth.
export async function GET() {
  const currentYear = new Date().getFullYear();

  const entries = await prisma.budgetMonthlyEntry.findMany({
    where: { year: currentYear },
  });

  const totalPagu = entries.reduce((sum, e) => sum + Number(e.paguBulan), 0);
  const totalRealisasi = entries.reduce((sum, e) => sum + Number(e.realisasi), 0);
  const persen = totalPagu > 0 ? Math.round((totalRealisasi / totalPagu) * 1000) / 10 : 0;

  return NextResponse.json({
    year: currentYear,
    totalPagu,
    totalRealisasi,
    persenPenyerapan: persen,
  });
}
