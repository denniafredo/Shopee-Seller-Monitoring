import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { shopeeGet } from '../clients/shopee.client.js';
import { CUSTOMER_STATUS } from '../constants/order.constant.js';
import { buildTimeRanges, chunkArray } from '../utils/range.util.js';
import { getShopeeTokens } from '../utils/shopeeTokenStore.js';

const DAY_SECONDS = 24 * 60 * 60;
const DEFAULT_HISTORY_DAYS = 365;
const DEFAULT_REFRESH_MS = 15 * 60 * 1000;
// Each refresh re-reads only this window: new orders/returns and the status changes that
// matter (cancelled orders, withdrawn return requests) happen within it. Older history is read once.
const RECENT_SYNC_DAYS = 30;
// Older history is backfilled one Shopee-sized range per tick, so the load stays flat.
const BACKFILL_CHUNK_DAYS = 15;
const SYNC_OVERLAP_SECONDS = 60 * 60;
const RETRY_AFTER_ERROR_MS = 5 * 60 * 1000;
const TICK_MS = 60 * 1000;
const MAX_RETURN_PAGES_PER_RANGE = 50;
const DATA_DIR = fileURLToPath(new URL('../../data/', import.meta.url));

// Orders that never became a real purchase, and return requests the buyer withdrew.
const IGNORED_ORDER_STATUSES = ['UNPAID', 'CANCELLED'];
const IGNORED_RETURN_STATUSES = ['CANCELLED'];

const RETURN_REASON_LABELS = {
  NOT_RECEIPT: 'Barang Tidak Diterima',
  WRONG_ITEM: 'Barang Salah',
  ITEM_DAMAGED: 'Barang Rusak',
  PHYSICAL_DMG: 'Barang Rusak',
  FUNCTIONAL_DMG: 'Tidak Berfungsi',
  ITEM_WRONGDAMAGED: 'Barang Salah/Rusak',
  DIFF_DESCRIPTION: 'Tidak Sesuai Deskripsi',
  ITEM_MISSING: 'Barang Kurang',
  ITEM_FAKE: 'Barang Palsu',
  EXPECTATION_FAILED: 'Tidak Sesuai Harapan',
  CHANGE_MIND: 'Berubah Pikiran',
  MUITAL_AGREE: 'Kesepakatan Bersama', // sic: Shopee's own enum spelling
  OTHER: 'Lainnya'
};

// Persisted to the history file, so a buyer keeps their history after it falls
// out of the window the API is read for (SHOPEE_CUSTOMER_HISTORY_DAYS).
const orderIndex = new Map(); // orderSn -> { orderSn, buyerUserId, buyerUsername, createTime, status }
const returnIndex = new Map(); // returnSn -> return request; every status, since a request can be cancelled later
let historySince = null; // unix seconds; history is complete from here up to syncedUntil
let syncedUntil = null; // unix seconds; end of the last successful recent sync
let loaded = false; // true once there is history to answer from (file or a sync)
let retryAt = 0; // ms; after a failed job, no new job starts before this
let inFlight = null;

/**
 * Keep every order and return seen so far, refreshed from the API in the
 * background, so each pending order can be tagged with its buyer's history
 * without extra API calls on the dashboard request itself.
 */
export function startCustomerHistoryAutoRefresh() {
  if (!isEnabled()) {
    console.log('Customer history disabled (SHOPEE_CUSTOMER_HISTORY_DAYS=0)');
    return;
  }

  loadHistoryFile();
  tick();
  setInterval(tick, TICK_MS);
}

/** Feed orders the dashboard already fetched, so a buyer's order from minutes ago counts. */
export function rememberOrders(orders = []) {
  if (!isEnabled()) return;

  orders.forEach((order) =>
    setOrderEntry({
      orderSn: order.orderNo,
      buyerUserId: order.buyerUserId,
      buyerUsername: order.buyerName,
      createTime: order.orderTimestamp,
      status: order.shopeeStatus
    })
  );
}

/** Attach `customer` to each normalized order; null until history is loaded. */
export function withCustomerStatus(orders = []) {
  if (!loaded) {
    return orders.map((order) => ({ ...order, customer: null }));
  }

  const activeReturns = [...returnIndex.values()].filter((item) => !IGNORED_RETURN_STATUSES.includes(item.status));
  const ordersByBuyer = groupByBuyer([...orderIndex.values()], (entry) => entry);
  const returnsByBuyer = groupByBuyer(activeReturns, (item) => ({
    buyerUserId: orderIndex.get(item.orderSn)?.buyerUserId,
    buyerUsername: item.buyerUsername
  }));

  return orders.map((order) => ({
    ...order,
    customer: buildCustomerStatus(order, ordersByBuyer, returnsByBuyer)
  }));
}

function buildCustomerStatus(order, ordersByBuyer, returnsByBuyer) {
  const buyer = { buyerUserId: order.buyerUserId, buyerUsername: order.buyerName };

  if (getBuyerKeys(buyer).length === 0) return null;

  const buyerReturns = findBuyerItems(returnsByBuyer, buyer, 'returnSn').sort(
    (a, b) => (b.createTime || 0) - (a.createTime || 0)
  );
  const previousOrderCount = findBuyerItems(ordersByBuyer, buyer, 'orderSn').filter(
    (entry) =>
      entry.orderSn !== order.orderNo &&
      (!order.orderTimestamp || (entry.createTime && entry.createTime < order.orderTimestamp)) &&
      !IGNORED_ORDER_STATUSES.includes(entry.status)
  ).length;
  const lastReturn = buyerReturns[0] || null;

  let status = CUSTOMER_STATUS.PELANGGAN_BARU;
  if (lastReturn) status = CUSTOMER_STATUS.PERNAH_RETUR;
  else if (previousOrderCount > 0) status = CUSTOMER_STATUS.PELANGGAN_LAMA;

  return {
    status,
    previousOrderCount,
    returnCount: buyerReturns.length,
    historySince: historySince ? new Date(historySince * 1000).toISOString() : null,
    lastReturn: lastReturn
      ? {
          returnSn: lastReturn.returnSn,
          orderSn: lastReturn.orderSn,
          status: lastReturn.status,
          reason: lastReturn.reason,
          reasonLabel: getReturnReasonLabel(lastReturn.reason),
          reasonText: lastReturn.reasonText,
          createdAt: lastReturn.createTime ? new Date(lastReturn.createTime * 1000).toISOString() : null
        }
      : null
  };
}

// At most one job per tick: the recent sync when it's due, otherwise one backfill chunk.
function tick() {
  if (inFlight || Date.now() < retryAt) return;

  const nowSeconds = Math.floor(Date.now() / 1000);
  let job = null;

  if (!syncedUntil || nowSeconds - syncedUntil >= getRefreshMs() / 1000) {
    job = { label: 'refresh', run: syncRecent };
  } else if (historySince > getTargetSince(nowSeconds)) {
    job = { label: 'backfill', run: backfillNextChunk };
  }

  if (!job) return;

  inFlight = job
    .run()
    .catch((error) => {
      retryAt = Date.now() + RETRY_AFTER_ERROR_MS;
      console.error(`Customer history ${job.label} failed:`, error?.message || error);
    })
    .finally(() => {
      inFlight = null;
    });
}

async function syncRecent() {
  const timeTo = Math.floor(Date.now() / 1000);
  // +1 keeps the window at exactly two 15-day Shopee ranges instead of spilling into a third.
  const recentFrom = timeTo - Math.min(RECENT_SYNC_DAYS, getHistoryDays()) * DAY_SECONDS + 1;
  // After a long downtime, reach back to where the last sync ended so no orders fall in a gap.
  const timeFrom = syncedUntil ? Math.min(recentFrom, syncedUntil - SYNC_OVERLAP_SECONDS) : recentFrom;

  await syncRange({ timeFrom, timeTo });

  historySince = Math.min(historySince || timeFrom, timeFrom);
  syncedUntil = timeTo;
  loaded = true;

  console.log(`Customer history refreshed: ${orderIndex.size} orders, ${returnIndex.size} returns`);
  await saveHistoryFile();
}

async function backfillNextChunk() {
  const timeTo = historySince - 1;
  const timeFrom = Math.max(getTargetSince(), historySince - BACKFILL_CHUNK_DAYS * DAY_SECONDS);

  await syncRange({ timeFrom, timeTo });

  historySince = timeFrom;

  console.log(
    `Customer history backfilled to ${new Date(timeFrom * 1000).toISOString().slice(0, 10)}: ` +
      `${orderIndex.size} orders, ${returnIndex.size} returns`
  );
  await saveHistoryFile();
}

async function syncRange({ timeFrom, timeTo }) {
  await syncOrders({ timeFrom, timeTo });
  await syncReturns({ timeFrom, timeTo });
}

async function syncOrders({ timeFrom, timeTo }) {
  const statuses = new Map(); // orderSn -> order_status

  for (const range of buildTimeRanges({ timeFrom, timeTo })) {
    let cursor = '';

    do {
      const data = await callShopee('/api/v2/order/get_order_list', {
        time_range_field: 'create_time',
        time_from: range.timeFrom,
        time_to: range.timeTo,
        page_size: 100,
        cursor,
        response_optional_fields: 'order_status'
      });

      (data.order_list || []).forEach((order) => {
        if (order.order_sn) statuses.set(order.order_sn, order.order_status || null);
      });

      cursor = data.more ? data.next_cursor || '' : '';
    } while (cursor);
  }

  // Buyer identity never changes, so only orders we haven't seen need a detail call.
  const unknownOrderSn = [...statuses.keys()].filter((orderSn) => !orderIndex.has(orderSn));

  for (const chunk of chunkArray(unknownOrderSn, 50)) {
    const data = await callShopee('/api/v2/order/get_order_detail', {
      order_sn_list: chunk.join(','),
      response_optional_fields: 'buyer_user_id,buyer_username,create_time,order_status'
    });

    (data.order_list || []).forEach((order) =>
      setOrderEntry({
        orderSn: order.order_sn,
        buyerUserId: order.buyer_user_id,
        buyerUsername: order.buyer_username,
        createTime: order.create_time,
        status: order.order_status
      })
    );
  }

  statuses.forEach((status, orderSn) => {
    const entry = orderIndex.get(orderSn);
    if (entry && status) entry.status = status;
  });
}

async function syncReturns({ timeFrom, timeTo }) {
  for (const range of buildTimeRanges({ timeFrom, timeTo })) {
    for (let pageNo = 0; pageNo < MAX_RETURN_PAGES_PER_RANGE; pageNo++) {
      const data = await callShopee('/api/v2/returns/get_return_list', {
        page_no: pageNo,
        page_size: 100,
        create_time_from: range.timeFrom,
        create_time_to: range.timeTo
      });
      const page = data.return || [];

      page.map(normalizeReturn).filter(Boolean).forEach((item) => returnIndex.set(item.returnSn, item));

      if (!data.more || page.length === 0) break;
    }
  }
}

function loadHistoryFile() {
  const filePath = getHistoryFilePath();

  if (!fs.existsSync(filePath)) return;

  try {
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

    (data.orders || []).forEach(setOrderEntry);
    (data.returns || []).forEach((item) => {
      if (item?.returnSn) returnIndex.set(item.returnSn, item);
    });
    historySince = data.historySince || null;
    // Files saved before syncedUntil existed were written right after a full refresh.
    syncedUntil = data.syncedUntil || (data.updatedAt ? Math.floor(Date.parse(data.updatedAt) / 1000) : null);
    loaded = Boolean(historySince);

    console.log(`Customer history loaded from ${filePath}: ${orderIndex.size} orders, ${returnIndex.size} returns`);
  } catch (error) {
    // Set the unreadable file aside rather than overwrite history the API can no longer return.
    const backupPath = `${filePath}.corrupt-${Date.now()}`;

    try {
      fs.renameSync(filePath, backupPath);
    } catch {
      // nothing more we can do; the error below is the signal
    }

    console.error(`Customer history file unreadable (${error.message}); moved to ${backupPath}`);
  }
}

async function saveHistoryFile() {
  const filePath = getHistoryFilePath();
  const tmpPath = `${filePath}.tmp`;
  const newestFirst = (a, b) => (b.createTime || 0) - (a.createTime || 0);
  const data = {
    updatedAt: new Date().toISOString(),
    historySince,
    syncedUntil,
    orders: [...orderIndex.values()].sort(newestFirst),
    returns: [...returnIndex.values()].sort(newestFirst)
  };

  try {
    await fs.promises.mkdir(path.dirname(filePath), { recursive: true });
    // Write-then-rename, so a crash mid-write never leaves a half-written history file.
    await fs.promises.writeFile(tmpPath, JSON.stringify(data, null, 2));
    await fs.promises.rename(tmpPath, filePath);
  } catch (error) {
    // The history in memory is still valid; the next successful save catches up.
    console.error('Customer history save failed:', error?.message || error);
  }
}

function getHistoryFilePath() {
  if (process.env.SHOPEE_CUSTOMER_HISTORY_FILE) {
    return path.resolve(process.env.SHOPEE_CUSTOMER_HISTORY_FILE);
  }

  // One file per shop, so switching shops (or sandbox/production) never mixes buyers.
  return path.join(DATA_DIR, `customer-history-${getShopeeTokens().shopId || 'unknown'}.json`);
}

function normalizeReturn(item) {
  if (!item?.return_sn) return null;

  const reasonText = item.text_reason ? String(item.text_reason).replace(/\s+/g, ' ').trim() : '';

  return {
    returnSn: String(item.return_sn),
    orderSn: item.order_sn || null,
    buyerUsername: item.user?.username || null,
    status: item.status || null,
    reason: item.reason || null,
    reasonText: reasonText || null,
    createTime: item.create_time || null
  };
}

function setOrderEntry({ orderSn, buyerUserId, buyerUsername, createTime, status }) {
  if (!orderSn) return;

  orderIndex.set(orderSn, {
    orderSn,
    buyerUserId: buyerUserId || null,
    buyerUsername: buyerUsername || null,
    createTime: createTime || null,
    status: status || null
  });
}

function getBuyerKeys({ buyerUserId, buyerUsername } = {}) {
  const keys = [];

  if (buyerUserId) keys.push(`id:${buyerUserId}`);

  // A masked username ("b*****a") could belong to anyone, so it can't identify a buyer.
  if (buyerUsername && !buyerUsername.includes('*')) {
    keys.push(`name:${buyerUsername.toLowerCase()}`);
  }

  return keys;
}

function groupByBuyer(items, getBuyer) {
  const map = new Map();

  items.forEach((item) => {
    getBuyerKeys(getBuyer(item)).forEach((key) => {
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(item);
    });
  });

  return map;
}

function findBuyerItems(map, buyer, idField) {
  const found = new Map();

  getBuyerKeys(buyer).forEach((key) => {
    (map.get(key) || []).forEach((item) => found.set(item[idField], item));
  });

  return [...found.values()];
}

function getReturnReasonLabel(reason) {
  if (!reason || reason === 'NONE') return null;

  if (RETURN_REASON_LABELS[reason]) return RETURN_REASON_LABELS[reason];

  const words = reason.toLowerCase().replace(/_/g, ' ');
  return words.charAt(0).toUpperCase() + words.slice(1);
}

async function callShopee(apiPath, params) {
  const result = await shopeeGet({ path: apiPath, params });

  if (result.error) {
    const error = new Error(`${apiPath}: ${result.message || result.error}`);
    error.data = result;
    throw error;
  }

  return result.response || {};
}

function getHistoryDays() {
  const raw = process.env.SHOPEE_CUSTOMER_HISTORY_DAYS;
  return raw === undefined || raw === '' ? DEFAULT_HISTORY_DAYS : Number(raw);
}

function getTargetSince(nowSeconds = Math.floor(Date.now() / 1000)) {
  return nowSeconds - getHistoryDays() * DAY_SECONDS;
}

function isEnabled() {
  return getHistoryDays() > 0;
}

function getRefreshMs() {
  return Number(process.env.SHOPEE_CUSTOMER_HISTORY_REFRESH_MS) || DEFAULT_REFRESH_MS;
}
