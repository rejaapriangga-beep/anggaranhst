# Konteks Project — KAI Human Capital Apps

## Tentang Project Ini
rj bekerja di PT Kereta Api Indonesia (KAI Persero), Human Capital Group, fokus Talent & Competency Management. Misi utama: membangun dan memelihara suite aplikasi web internal HC yang saling terintegrasi — MyCareer, MyCompetency, ITMS, AnggaranHC — plus dokumen governance HC formal. Semua aplikasi melayani operasional HR KAI Group dan harus bekerja sebagai satu ekosistem talent management terintegrasi.

Peran rj mencakup dua sisi: developer/admin (nulis kode produksi, deploy infra) dan penulis governance HC (menyusun pedoman formal dengan sitasi regulasi & akademik yang tepat).

---

## Aplikasi Aktif

### Path Folder di VPS (referensi cepat)
| Project | Path |
|---|---|
| MyCompetency | `/var/www/mycompetency` |
| ITMS | `/var/www/itms` |
| AnggaranHC | `/var/www/anggaran-app` |
| Portal | `/var/www/portal` |
| MyCareer | `/var/www/html` (static HTML, lihat catatan di bawah) |

### MyCompetency
- Domain: `mycompetency.hst.web.id`, PM2 process: `mycompetency`
- Fitur: kamus kompetensi, gap analysis (radar chart, stat cards), development plan, Generator Profil Kompetensi dengan 4 sumber hybrid (Template by Grade, AI Generate, Sejenis/Jaccard Similarity, Manual SME Input)
- Semua 983 jabatan sudah punya minimal satu kompetensi — Generator Profil Kompetensi bersifat augmentasi/penyempurnaan, bukan generate dari nol
- Belum dideploy: schedule management + `DevelopmentPlanActivity` model + Training Catalog (file/brosur upload, dedup via `fileUrl`/`fileHash`) — script `patch_schema_v3.py` sudah disiapkan
- Route `/generate-kompetensi` ada tapi belum terdokumentasi detail

### MyCareer
- Domain: `mycareer.hst.web.id`, DB: `career_db`
- **Path folder di VPS: `/var/www/html`** — bukan Next.js app folder terpisah seperti aplikasi lain; ini adalah kumpulan file HTML statis (`career-path.html`, `admin-career.html`, `struktur-organisasi.html`, `succession-planning.html`, `db-upload.html`, `admin-anak.html`, `admin-pusat-anak.html`, `pola-pengembangan.html`, `role-guide.html`, `login.html`, `index.html`, `activity-log.html`, `change-password.html`, dll.)
- **Penting**: folder ini berisi sangat banyak file arsip berpola `*.bak*`, `*.backup-*`, `*.backup_*` (histori edit manual sejak Juni 2026). File-file ini BUKAN bagian aktif dari aplikasi — abaikan saat membaca/mengedit kode, jangan sampai tertukar dengan file aktif yang sedang dipakai production
- Ada juga folder `js/`, `.git/`, `.github/`, dan file `schema.graphql`, `auth-cache.js`, `favicon.svg` di dalamnya
- Fitur: career path generation, succession planning (Job Target list + candidate management, cross-DB competency gap matching), talent scores, admin struktur organisasi
- DB user `dev_user` (pw `HSTdev2026`) — SELECT-only di tabel `nodes`; owner tabel adalah role `hasura` yang punya full privilege. INSERT/UPDATE/DELETE ke `nodes` tidak tersedia untuk `dev_user`

### ITMS
- Domain: `itms.hst.web.id`, port 3003, PM2
- Fitur: Job Target/Succession Planning dengan cross-DB Jaccard similarity, user management, public stats API
- Baca dari `career_db` dan `mycompetency_db`

### AnggaranHC
- App: `anggaran-app`, port 3004, DB: `anggaran_db`
- Fitur: budget monitoring unit HC, reporting hierarkis gaya SAP FM, inline editing, audit log, role-based access (ADMIN/EDITOR/VIEWER), filter Unit (HSTA/HSTC/HSTD/HST.1), export Excel/PDF

### Portal
- Static HTML di `/var/www/portal/index.html`, `hst.web.id`
- Link ke 4 aplikasi via card, konsumsi `/api/stats/public` masing-masing app

### Homeschool Platform (deferred)
- Stack Docker terpisah di VPS yang sama, belum jadi prioritas

---

## Governance Documents

- **PED-HC-CP-001**: Career path mapping (job-to-job, bukan berbasis incumbent). Skor: Job Family 35%, Jaccard Competency Similarity 45%, Grade Proximity 20%
- **PED-HC-COMP-001** (Revisi 01): Job Competency Profile. Validator = atasan langsung/pimpinan tertinggi unit kerja, BUKAN pemilik jabatan/incumbent. Referensi ISO 10015:2019 dan ISO 30414:2018

**Prinsip penting yang harus selalu dijaga di semua fitur/dokumen terkait:**
- Job-level vs incumbent-level harus dipisah tegas — semua fitur/dokumen scope-nya ke arsitektur jabatan/posisi, bukan data individu pegawai
- Validator ≠ pemilik jabatan — selalu atasan langsung atau pimpinan tertinggi unit kerja

---

## Infrastruktur

- VPS: Ubuntu 24.04.4 LTS, IP publik `43.129.58.199`, internal `10.11.1.8`, ~59GB disk, dikelola via CyberPanel, PM2, Nginx
- DNS/hosting: Sumopod (ns1/ns2.sumopod.com), SSL via Let's Encrypt DNS-01 challenge (HTTP validation diblok di layer network)
- Docker stack terpisah: homeschool-platform-app + postgres:16-alpine + Hasura GraphQL Engine
- Disk dibersihkan ke ~37% usage; cron mingguan (root crontab, Minggu jam 3 pagi) untuk journal vacuum, docker builder prune, npm cache clean

### Database
| DB | User | Password | Catatan |
|---|---|---|---|
| `career_db` | `dev_user` | `HSTdev2026` | SELECT-only di tabel `nodes`; owner = role `hasura` |
| `mycompetency_db` | `mycomp_user` | `Apriangga11` | |
| `anggaran_db` | `anggaran_user` | — | |
| `itms_db` | `itms_user` | — | |

---

## Stack Teknis
- Next.js 16 (Turbopack), Prisma v7.9.1 + `@prisma/adapter-pg`, PostgreSQL, NextAuth v4 (Credentials + bcryptjs), PM2, Nginx, CyberPanel
- Charting: Chart.js/react-chartjs-2 (radar), Recharts (radar di modal kandidat ITMS)
- Export: jsPDF + autoTable (PDF), Excel export
- Dokumen governance: Node.js `docx` library

---

## Learnings & Fix Berulang (Prisma v7 dkk.)
- Hapus field `url` dari datasource block `schema.prisma` — wajib pakai `prisma.config.ts`
- `params` adalah Promise di Next.js 16 route handlers
- `middleware.ts` sudah digantikan `proxy.ts`
- Pakai `prisma db push` (bukan `prisma migrate dev`) kalau migration history tidak sinkron dengan state DB aktual
- `create-next-app` harus di-scaffold di direktori writable (`~/app-temp`) lalu di-rsync ke `/var/www/` — hindari error permission direktori induk
- SonarQube container dengan restart policy `always`/`unless-stopped` bisa auto-restart meski tampak "Exited" — `docker rm` gagal sampai container di-stop eksplisit dulu

## Algoritma Inti
Jaccard similarity dipakai lintas fitur: career path scoring, competency gap analysis, source "Sejenis" di Generator Profil Kompetensi — termasuk fungsi `GAP_IGNORE_WORDS`, `gapNormalizeJobName`, `gapJaccardSimilarity` yang di-port dari `career-api/server.js`.

---

## Pola Kerja / Workflow

**Deployment:**
Edit lokal/sandbox → zip → download → SCP dari PowerShell (`PS C:\Users\61612\Downloads>`) → SSH ke VPS → extract → copy ke `/var/www/<app>` → `npm run build > /tmp/buildN.log 2>&1` → `pm2 restart <app>` → verifikasi dengan `tail -N /tmp/buildN.log`

**Perubahan schema:**
Pakai Python patch script dengan `replace_once()` anchor validation + backup timestamped otomatis — lebih reliable daripada edit file langsung

**Modifikasi file HTML existing:**
Python patch script dengan single-occurrence anchor matching (dipakai untuk portal, halaman admin MyCareer, dll.)

**Preferensi terminal:**
Satu command per waktu via SSH; heredoc untuk nulis isi file langsung kalau memungkinkan; pattern `sudo sh -c 'command >> file'` untuk shell redirect yang butuh elevated permission

**File collision mitigation:**
Nama file unik berprefix untuk download (mis. `itms-nextauth-route.ts`), verifikasi dengan `head -3` sebelum deploy

**Dokumen governance:**
Kombinasikan sitasi regulasi Indonesia (Permen BUMN), standar internasional (ISO 30414:2018, ISO 10015:2019), sumber akademik (Spencer & Spencer, Jaccard 1912), dan framework industri (Korn Ferry, SHRM, AIHR, Mercer). Format `.docx` via Node.js `docx` library

---

## Rencana Ke Depan
- Deploy `patch_schema_v3.py` untuk MyCompetency (schedule management + `DevelopmentPlanActivity` + Training Catalog)
- Klarifikasi & dokumentasikan route `/generate-kompetensi` di MyCompetency
- Pengembangan homeschool platform (Docker-based, masih ditunda)
- Kemungkinan dokumen governance HC tambahan dengan penamaan PED-HC-xxx
