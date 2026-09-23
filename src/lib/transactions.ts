import { prisma } from "./prisma";

// Dipanggil setiap kali transaksi ditambah/diubah/dihapus. Menjumlahkan seluruh
// transaksi realisasi untuk activityId+year yang sama, lalu menyimpannya ke
// BudgetMonthlyEntry.realisasi (month selalu 1, dipakai sebagai 1 baris/tahun) —
// field lain di baris itu (paguBulan, komitmen, status, note) tidak disentuh.
export async function syncRealisasiFromTransactions(activityId: string, year: number) {
  const agg = await prisma.transaction.aggregate({
    where: { activityId, year },
    _sum: { amount: true },
  });
  const total = agg._sum.amount ?? 0;

  await prisma.budgetMonthlyEntry.upsert({
    where: { activityId_month_year: { activityId, month: 1, year } },
    update: { realisasi: total },
    create: {
      activityId,
      month: 1,
      year,
      paguBulan: 0,
      komitmen: 0,
      realisasi: total,
    },
  });

  return total;
}
