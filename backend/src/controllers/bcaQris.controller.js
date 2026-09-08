import { getQrisSettlement, refreshQrisSettlement } from '../services/bcaQris.service.js';
import { formatDateWIB, formatTimeWIB } from '../utils/date.util.js';

// GET /api/qris/settlement -> cached (auto-refreshed hourly)
export async function qrisSettlement(req, res, next) {
  try {
    const data = await getQrisSettlement({ force: false });
    res.json(data);
  } catch (error) {
    next(error);
  }
}

// POST /api/qris/refresh -> force a fresh scrape of today's QRIS mutasi
export async function qrisRefresh(req, res, next) {
  try {
    const data = await refreshQrisSettlement();
    res.json({
      ...data,
      date: formatDateWIB(),
      lastUpdated: formatTimeWIB(),
      refreshed: true
    });
  } catch (error) {
    res.status(502).json({
      success: false,
      message: error?.message || 'Gagal refresh data QRIS dari BCA',
      date: formatDateWIB(),
      lastUpdated: formatTimeWIB()
    });
  }
}
