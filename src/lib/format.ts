// Buang semua karakter selain angka dan tanda minus di depan (untuk input
// koreksi/retur yang butuh nilai negatif), lalu pastikan cuma ada satu "-" di awal.
export function stripThousands(value: string): string {
  const cleaned = value.replace(/[^\d-]/g, "");
  const negative = cleaned.startsWith("-");
  const digits = cleaned.replace(/-/g, "");
  return negative ? `-${digits}` : digits;
}

// Format nilai mentah (hasil stripThousands) jadi tampilan dengan pemisah ribuan,
// contoh: "-5000000" -> "-5.000.000". Mempertahankan "-" saat baru mulai diketik.
export function formatThousands(value: string): string {
  const digits = stripThousands(value);
  if (!digits || digits === "-") return digits;
  const num = Number(digits);
  if (Number.isNaN(num)) return "";
  return new Intl.NumberFormat("id-ID").format(num);
}
