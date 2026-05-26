# Shopee Dashboard Frontend

Frontend React untuk monitoring pesanan Shopee.

## Requirement

- Node.js 18+
- Backend `shopee-dashboard-api-direct` sudah running di port 3000

## Setup

```bash
npm install
cp .env.example .env
npm run dev
```

Buka:

```txt
http://localhost:5173
```

## Environment

`.env`

```env
VITE_API_BASE_URL=http://localhost:3000
```

## Endpoint yang dipakai

Frontend ini memakai endpoint:

```txt
GET  /api/shopee/orders/dashboard-summary
GET  /api/shopee/orders/pending/grouped
POST /api/shopee/sync-orders
```

Kalau endpoint `/api/shopee/orders/pending/grouped` belum ada, frontend otomatis fallback ke:

```txt
GET /api/shopee/orders/pending
```

lalu grouping dilakukan di frontend.

## Build production

```bash
npm run build
npm run preview
```
