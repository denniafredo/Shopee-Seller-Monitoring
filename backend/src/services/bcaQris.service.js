import { fetchQrisSettlement } from '../clients/bcaQris.client.js';
import { formatTimeWIB, formatDateWIB } from '../utils/date.util.js';

const REFRESH_INTERVAL_MS = Number(process.env.QRIS_REFRESH_INTERVAL_MS || 3_600_000);

let cache = null; // last successful result
let lastError = null; // last error message
let inFlight = null; // single-flight promise
let autoTimer = null;

/**
 * Scrape now (deduped). Concurrent callers share one browser run so a manual
 * refresh during the hourly job doesn't open two sessions.
 */
export async function refreshQrisSettlement() {
  if (inFlight) return inFlight;

  inFlight = (async () => {
    try {
      const data = await fetchQrisSettlement();
      cache = {
        ...data,
        date: formatDateWIB(),
        lastUpdated: formatTimeWIB()
      };
      lastError = null;
      return cache;
    } catch (err) {
      lastError = err?.message || 'Gagal mengambil data QRIS';
      throw err;
    } finally {
      inFlight = null;
    }
  })();

  return inFlight;
}

/** Return cached data; scrape once on cold start. */
export async function getQrisSettlement({ force = false } = {}) {
  if (force || !cache) {
    try {
      await refreshQrisSettlement();
    } catch {
      // fall through to whatever we have (possibly stale/empty)
    }
  }

  return {
    date: cache?.date || formatDateWIB(),
    lastUpdated: cache?.lastUpdated || null,
    total: cache?.total ?? 0,
    count: cache?.count ?? 0,
    currency: cache?.currency || 'IDR',
    transactions: cache?.transactions || [],
    source: cache?.source || 'qr.klikbca.com',
    scrapedAt: cache?.scrapedAt || null,
    stale: !cache,
    error: cache ? null : lastError
  };
}

export function startQrisAutoRefresh() {
  if (autoTimer) return;

  // Kick off an initial scrape shortly after boot (non-blocking).
  setTimeout(() => {
    refreshQrisSettlement().catch((err) =>
      console.error('[QRIS] initial refresh failed:', err.message)
    );
  }, 4_000);

  autoTimer = setInterval(() => {
    refreshQrisSettlement().catch((err) =>
      console.error('[QRIS] scheduled refresh failed:', err.message)
    );
  }, REFRESH_INTERVAL_MS);

  console.log(`[QRIS] auto-refresh every ${Math.round(REFRESH_INTERVAL_MS / 60000)} min`);
}
