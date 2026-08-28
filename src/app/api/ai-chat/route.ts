import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Self-hosted Ollama di VPS terpisah (43.157.200.115) — data anggaran tidak pernah
// keluar ke pihak ketiga, cuma antar server milik sendiri, dikunci lewat firewall
// supaya hanya server AnggaranHC ini yang bisa akses port Ollama-nya.
const OLLAMA_URL = process.env.OLLAMA_URL || "http://43.157.200.115:11434";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "qwen2.5:3b";

// POST /api/ai-chat — chat tanya-jawab soal data anggaran, dijawab AI (Ollama, self-hosted)
// berdasarkan data RKAP/realisasi tahun berjalan yang diambil langsung dari database.
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { messages } = body;
  if (!Array.isArray(messages) || messages.length === 0) {
    return NextResponse.json({ error: "messages wajib diisi." }, { status: 400 });
  }

  const year = new Date().getFullYear();
  const categories = await prisma.budgetCategory.findMany({
    where: { year },
    include: { activities: { include: { entries: { where: { year } } } } },
    orderBy: { name: "asc" },
  });

  // Ringkasan per Pos Anggaran SAJA — tanpa nama/rincian tiap Sub-Kegiatan sama sekali.
  // Server CPU-only ini ~18-20 token/detik; makin kecil prompt makin cepat jawabnya.
  // Trade-off: AI tidak bisa jawab pertanyaan level Sub-Kegiatan individual, cuma level Pos Anggaran.
  const data = categories.map((cat) => {
    let rkap = 0, release = 0, commitment = 0, actual = 0;
    cat.activities.forEach((act) => {
      rkap += Number(act.totalPagu);
      act.entries.forEach((e) => {
        release += Number(e.paguBulan || 0);
        commitment += Number(e.komitmen || 0);
        actual += Number(e.realisasi);
      });
    });
    return {
      pos_anggaran: cat.name,
      kode: cat.code || null,
      jumlah_sub_kegiatan: cat.activities.length,
      rkap,
      release_budget: release,
      commitment,
      realisasi: actual,
      sisa: rkap - actual,
      persen_serap: rkap > 0 ? Number(((actual / rkap) * 100).toFixed(1)) : 0,
    };
  });

  const systemPrompt = `Kamu adalah asisten AI untuk aplikasi AnggaranHC — sistem monitoring penyerapan anggaran Human Capital.
Data di bawah ini RINGKASAN per Pos Anggaran tahun ${year} (level kategori besar, bukan rincian tiap Sub-Kegiatan satu-satu).
Jawab pertanyaan HANYA berdasarkan data ini, jangan mengarang angka. Kalau ditanya soal Sub-Kegiatan tertentu (bukan per Pos Anggaran),
katakan terus terang datanya tidak tersedia di ringkasan ini dan sarankan buka halaman Laporan atau Input Realisasi untuk detailnya.
Jawab dalam Bahasa Indonesia, singkat dan jelas, format angka Rupiah pakai pemisah ribuan (contoh: Rp 5.000.000).

DATA RINGKASAN ANGGARAN ${year}:
${JSON.stringify(data)}`;

  const ollamaMessages = [
    { role: "system", content: systemPrompt },
    ...messages.slice(-10),
  ];

  try {
    const res = await fetch(`${OLLAMA_URL}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        messages: ollamaMessages,
        stream: false,
        options: { temperature: 0.3 },
      }),
      // Data anggaran cukup besar (puluhan Sub-Kegiatan) jadi prompt-nya ~3000+ token —
      // di CPU 2-core ini bisa makan beberapa menit, terutama request pertama (model belum di-load).
      signal: AbortSignal.timeout(280000),
    });

    if (!res.ok) {
      const errBody = await res.text();
      console.error("[AI CHAT OLLAMA ERROR]", res.status, errBody);
      return NextResponse.json({ error: "Gagal menghubungi layanan AI. Coba lagi sebentar." }, { status: 502 });
    }

    const json = await res.json();
    const reply = json.message?.content || "Maaf, tidak ada jawaban.";
    return NextResponse.json({ reply });
  } catch (e: any) {
    console.error("[AI CHAT ERROR]", e.message);
    const timedOut = e.name === "TimeoutError" || e.name === "AbortError";
    return NextResponse.json(
      { error: timedOut ? "AI butuh waktu terlalu lama untuk menjawab. Coba pertanyaan lebih singkat." : "Gagal menghubungi layanan AI." },
      { status: 504 }
    );
  }
}
