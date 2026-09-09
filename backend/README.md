# Shopee Dashboard API Direct

Versi ini tidak pakai Prisma dan tidak pakai database. Semua data order langsung diambil dari Shopee API.

## Setup

```bash
npm install
cp .env.example .env
npm run dev
```

Isi `.env` dengan credential Shopee kamu.

Untuk sandbox:

```env
SHOPEE_HOST="https://partner.test-stable.shopeemobile.com"
```

Untuk production:

```env
SHOPEE_HOST="https://partner.shopeemobile.com"
```

Jangan campur credential sandbox dengan host production.

## Auth

Buka endpoint ini:

```http
GET http://localhost:3000/api/shopee/auth
```

Copy URL dari response, buka di browser, login seller, authorize.

Callback akan return `shop_id`, `access_token`, dan `refresh_token`. Copy ke `.env`, lalu restart server.

## Endpoints

Health check:

```http
GET http://localhost:3000/
```

Unix timestamp hari ini WIB:

```http
GET http://localhost:3000/api/shopee/today-range
```

Ambil order langsung dari Shopee API:

```http
POST http://localhost:3000/api/shopee/sync-orders
Content-Type: application/json

{}
```

Ambil order dengan range khusus:

```http
POST http://localhost:3000/api/shopee/sync-orders
Content-Type: application/json

{
  "timeFrom": 1779123600,
  "timeTo": 1779209999,
  "pageSize": 20
}
```

Dashboard summary:

```http
GET http://localhost:3000/api/shopee/orders/dashboard-summary
```

List pending:

```http
GET http://localhost:3000/api/shopee/orders/pending
```

Secara default endpoint pending/dashboard mengambil pesanan pending dari 5 hari terakhir dan memecah request ke beberapa range waktu. Kalau perlu lebih jauh, set di `.env`:

```env
SHOPEE_PENDING_LOOKBACK_DAYS=180
```

Filter:

```http
GET http://localhost:3000/api/shopee/orders/pending?shippingType=INSTANT&status=BARU&page=1&limit=20
```

Detail order:

```http
GET http://localhost:3000/api/shopee/orders/{orderNo}
```

Refresh token:

```http
POST http://localhost:3000/api/shopee/auth/refresh-token
```

## Catatan

Karena tidak pakai database, setiap kali frontend panggil dashboard, backend akan hit Shopee API. Ini simple untuk testing, tapi untuk production lebih baik tetap pakai database/cache supaya tidak boros API limit dan dashboard lebih cepat.

## QRIS Settlement (BCA Merchant — qr.klikbca.com)

Menampilkan total settlement QRIS **hari ini** dari portal merchant BCA
(`https://qr.klikbca.com`). Karena portal BCA melakukan enkripsi sisi-klien
(MCB V2) dan hanya mengizinkan satu sesi aktif per akun, backend **tidak**
meniru API-nya. Sebagai gantinya kami menjalankan Chrome yang sudah terpasang
lewat `puppeteer-core` (tanpa download Chromium), login memakai kredensial
merchant, membuka halaman `home?mid=...`, lalu membaca daftar transaksi yang
sudah dirender. Sesi login disimpan di `.qris-session/` agar login jarang
dilakukan.

### Env

```env
MERCH_USERNAME="username_merchant_bca"
MERCH_PASSWORD="password_merchant_bca"
QRIS_MID=004047768
QRIS_REFRESH_INTERVAL_MS=3600000   # auto-scrape tiap 1 jam
QRIS_HEADLESS=true                 # false untuk lihat browser saat debug
# Path Chrome/Edge yang dipakai puppeteer-core (tidak download browser baru)
PUPPETEER_EXECUTABLE_PATH=C:\Program Files\Google\Chrome\Application\chrome.exe
```

Akun merchant ini harus **khusus** untuk dashboard — kalau dipakai login manual
di HP/browser lain secara bersamaan, BCA akan me-logout salah satu sesi.

### Endpoints

Data settlement (cache, otomatis di-refresh tiap 1 jam):

```http
GET http://localhost:3000/api/qris/settlement
```

Refresh manual (paksa ambil ulang data QRIS hari ini dari BCA):

```http
POST http://localhost:3000/api/qris/refresh
```

Contoh response:

```json
{
  "date": "Selasa, 8 September 2026",
  "lastUpdated": "21.36",
  "total": 182000,
  "count": 3,
  "currency": "IDR",
  "transactions": [
    { "bank": "BRI", "name": "**HIM WICA***NO", "amount": 41000,
      "rrn": "209221124393", "nmid": "ID1025439126885", "time": "18:35", "status": "Masuk" }
  ]
}
```

### Debug

Setiap scrape menyimpan snapshot teks halaman ke `.qris-debug/` (5 terakhir).
Kalau layout BCA berubah dan parsing meleset, kalibrasi ulang parser di
`src/clients/bcaQris.client.js` (`parseSettlementText`) berdasarkan file
`.qris-debug/settlement-*.txt`. Saat login gagal, snapshot lengkap
(`.txt` + `.html` + `.png`) disimpan untuk memudahkan investigasi (mis. jika
BCA meminta OTP).

### Deploy di AWS EC2 (Linux)

Kode otomatis mendeteksi path Chrome Linux. Kalau di EC2 sudah pernah ada
project puppeteer, biasanya binary Chrome sudah ke-download di
`~/.cache/puppeteer/chrome/...` — **pakai itu saja, tak perlu install Chrome
baru** (hemat disk). Cek:

```bash
find ~/.cache/puppeteer/chrome -type f -name chrome
```

Binary hasil download itu sering **kurang library sistem**. Cek & install
depend­ency-nya (kecil, ±50–100 MB — bukan Chrome-nya):

```bash
# Lihat lib yang kurang
ldd <path-chrome-di-atas> | grep "not found"

# Install dependency Chrome (Ubuntu 20.04)
sudo apt-get update
sudo apt-get install -y \
  libatk1.0-0 libatk-bridge2.0-0 libatspi2.0-0 libcups2 libdrm2 libgbm1 \
  libxkbcommon0 libxcomposite1 libxdamage1 libxfixes3 libxrandr2 libnss3 \
  libnspr4 libpango-1.0-0 libcairo2 libasound2 libgtk-3-0 fonts-liberation libu2f-udev

# Verifikasi
<path-chrome> --version
<path-chrome> --headless=new --no-sandbox --disable-gpu --dump-dom https://example.com >/dev/null && echo "HEADLESS OK"
```

Kalau memang belum ada Chrome sama sekali, baru install penuh:
`sudo apt-get install -y ./google-chrome-stable_current_amd64.deb` (±350 MB).

Lalu di `.env` EC2 (pakai path hasil `find` di atas):

```env
PUPPETEER_EXECUTABLE_PATH=/home/ubuntu/.cache/puppeteer/chrome/linux-XXX/chrome-linux64/chrome
QRIS_HEADLESS=true
QRIS_KEEP_BROWSER=false        # tutup Chrome tiap selesai scrape -> hemat RAM
QRIS_MIN_FREE_DISK_MB=800      # skip scrape kalau sisa disk < 800 MB (0 = matikan)
QRIS_ALWAYS_FRESH_LOGIN=true   # login ulang tiap scrape (aman dari token basi)
```

Catatan resource:
- RAM: Chrome ±400–700 MB sesaat. `QRIS_KEEP_BROWSER=false` melepas RAM lagi
  setelah scrape. Sesi login tersimpan di `.qris-session/` (disk), jadi relaunch
  **tidak** login ulang.
- Disk: **disk-guard** menolak launch Chrome kalau sisa disk di bawah
  `QRIS_MIN_FREE_DISK_MB`, jadi scraper tak akan pernah bikin disk penuh — endpoint
  mengembalikan cache terakhir + pesan error. Chrome menulis profil + `/tmp` saat
  jalan, jadi sediakan ruang lega.
- Flag `--no-sandbox`, `--disable-dev-shm-usage`, `--disable-gpu` sudah aktif.

Kalau nanti pindah ke Lambda/serverless, ganti ke paket `@sparticuz/chromium`
(chromium ±50 MB khusus serverless) dan arahkan `executablePath` ke sana —
sisa logikanya sama.
