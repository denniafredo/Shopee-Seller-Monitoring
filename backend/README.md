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

Secara default endpoint pending/dashboard mengambil pesanan pending dari 90 hari terakhir dan memecah request ke beberapa range waktu. Kalau perlu lebih jauh, set di `.env`:

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
