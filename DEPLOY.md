# Deploy AnggaranHC ke VPS

Ikuti urutan ini satu command per satu waktu via SSH ke `ubuntu@43.129.58.199`.

## 1. Buat database

```
sudo -u postgres psql -c "CREATE DATABASE anggaran_db;"
```
```
sudo -u postgres psql -c "CREATE USER anggaran_user WITH ENCRYPTED PASSWORD 'GANTI_PASSWORD_DISINI';"
```
```
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE anggaran_db TO anggaran_user;"
```

## 2. Scaffold di temp folder (hindari masalah ownership /var/www)

```
mkdir -p ~/anggaran-temp
```

Upload seluruh isi folder `anggaran-app/` ke `~/anggaran-temp` (SCP dari PowerShell, sama seperti proyek lain).

## 3. Install dependencies

```
cd ~/anggaran-temp && npm install
```

## 4. Setup .env

```
cp .env.example .env
```

Lalu edit `.env`: isi `DATABASE_URL` dengan password anggaran_user yang benar, isi `NEXTAUTH_URL=https://anggaran.hst.web.id`, dan generate `NEXTAUTH_SECRET`:

```
openssl rand -base64 32
```

## 5. Push schema ke database (pola yang sudah terbukti untuk Prisma v7)

```
npx prisma generate
```
```
npx prisma db push
```

## 6. Seed admin user pertama

```
SEED_ADMIN_EMAIL="admin@hst.web.id" SEED_ADMIN_PASSWORD="GANTI_PASSWORD" node prisma/seed.js
```

## 7. Build

```
npm run build
```

## 8. Pindahkan ke lokasi final

> **PENTING:** ikutkan `node_modules` saat rsync, dan **jangan** `npm install` lagi setelah ini.
> `next build` (langkah 7) membakukan referensi ke Prisma client yang persis ada di `node_modules` saat itu
> (Turbopack meng-externalize Prisma client pakai nama ber-hash, mis. `@prisma/client-2c3a283f134fdcb6`).
> Kalau `node_modules` di-install ulang setelah build — walau cuma `npm install --production` — `prisma generate`
> ikut terpicu lagi lewat postinstall hook dan hasil generate-nya tidak lagi cocok dengan yang dirujuk `.next`,
> sehingga runtime gagal resolve module dan halaman yang pakai Prisma (mis. `/activities`) crash dengan error
> `Cannot find module '@prisma/client-<hash>'`. Ini pernah kejadian di production pada Agustus 2026 dan sudah
> diperbaiki dengan rebuild in-place — lihat langkah 13.

```
sudo mkdir -p /var/www/anggaran-app
```
```
rsync -a ~/anggaran-temp/ /var/www/anggaran-app/
```

(tidak ada `--exclude node_modules` dan tidak ada `npm install --production` sesudahnya — `node_modules` yang dipakai untuk build di langkah 7 harus persis sama dengan yang dipakai runtime.)

## 9. Jalankan dengan PM2 (port 3004)

```
cd /var/www/anggaran-app
```
```
pm2 start npm --name anggaran-app -- start
```
```
pm2 save
```

## 10. Konfigurasi Nginx reverse proxy

Buat file `/etc/nginx/sites-available/anggaran.hst.web.id` dengan proxy_pass ke `http://localhost:3004`, lalu symlink ke sites-enabled — pola sama seperti `itms.hst.web.id`.

## 11. SSL via Let's Encrypt DNS-01

Sama seperti domain lain (HTTP validation diblokir di layer network), pakai DNS-01 challenge via Sumopod panel.

## 12. Tambahkan card di portal

Patch `/var/www/portal/index.html` untuk menambahkan card ke-4: AnggaranHC, mengarah ke `https://anggaran.hst.web.id`, mengambil ringkasan dari `/api/stats/public`.

## 13. Update kode setelah deploy awal (bukan deploy dari nol)

Untuk perubahan kode berikutnya, **jangan** ulangi alur temp-folder + rsync + install di atas. Cukup:

```
cd /var/www/anggaran-app
```

Update file source (edit langsung, atau rsync/scp file yang berubah — tanpa menyentuh `node_modules`).

```
npx prisma generate
```
```
npm run build
```
```
pm2 restart anggaran-app
```

Kuncinya: `prisma generate`, `npm run build`, dan `pm2 restart` dijalankan berurutan **tanpa** ada `npm install` di antaranya, supaya Prisma client yang dirujuk build selalu sama dengan yang ada di `node_modules` saat runtime.

---

**Catatan:**
- Role user pertama harus `ADMIN` (sudah diatur di seed script) supaya bisa hapus data & kelola user lain.
- Middleware sudah memproteksi semua route `/dashboard`, `/categories`, `/activities`, `/entries`, `/reports` — otomatis redirect ke `/login` kalau belum auth.
- `/api/stats/public` sengaja tanpa auth supaya bisa dipanggil dari portal.
