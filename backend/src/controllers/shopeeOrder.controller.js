import {
  getDashboardSummary,
  getPendingOrders,
  getOrderDetail,
  syncShopeeOrdersFromApi,
  refreshShopeeTokenFromEnv,
  getPendingOrdersGrouped
} from '../services/shopeeOrder.service.js';
import { getShopeeAuthUrl, getAccessToken } from '../clients/shopee.client.js';
import { formatDateWIB, formatTimeWIB, getTodayUnixRangeWIB } from '../utils/date.util.js';

export async function authShopee(req, res, next) {
  try {
    res.json({ url: getShopeeAuthUrl() });
  } catch (error) {
    next(error);
  }
}

export async function shopeeAuthCallback(req, res, next) {
  try {
    const { code, shop_id } = req.query;

    if (!code || !shop_id) {
      return res.status(400).json({
        success: false,
        message: 'code and shop_id are required'
      });
    }

    const result = await getAccessToken({ code, shopId: shop_id });

    res.json({
      success: true,
      message: 'Shopee token generated. Copy shop_id, access_token, and refresh_token to your .env file, then restart server.',
      data: result
    });
  } catch (error) {
    next(error);
  }
}

export async function refreshToken(req, res, next) {
  try {
    const result = await refreshShopeeTokenFromEnv();

    res.json({
      success: true,
      message: 'Token refreshed. Copy the new access_token and refresh_token to your .env file, then restart server.',
      data: result
    });
  } catch (error) {
    next(error);
  }
}

export async function todayRange(req, res) {
  const range = getTodayUnixRangeWIB();

  res.json({
    time_range_field: 'create_time',
    time_from: range.timeFrom,
    time_to: range.timeTo,
    page_size: 20
  });
}

export async function dashboardSummary(req, res, next) {
  try {
    const summary = await getDashboardSummary(req.query);

    res.json({
      date: formatDateWIB(),
      lastUpdated: formatTimeWIB(),
      summary
    });
  } catch (error) {
    next(error);
  }
}

export async function pendingOrders(req, res, next) {
  try {
    const result = await getPendingOrders(req.query);

    res.json({
      date: formatDateWIB(),
      lastUpdated: formatTimeWIB(),
      ...result
    });
  } catch (error) {
    next(error);
  }
}

export async function orderDetail(req, res, next) {
  try {
    const { orderNo } = req.params;
    const result = await getOrderDetail(orderNo);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function syncOrders(req, res, next) {
  try {
    const params = {
      ...req.query,
      ...req.body
    };

    const result = await syncShopeeOrdersFromApi(params);

    res.json({
      ...result,
      date: formatDateWIB(),
      lastUpdated: formatTimeWIB()
    });
  } catch (error) {
    next(error);
  }
}

export async function changeOrderStatus(req, res) {
  res.status(501).json({
    success: false,
    message: 'This no-database version reads order status directly from Shopee API. Local status update is disabled.'
  });
}

export async function pendingOrdersGrouped(req, res, next) {
  try {
    const result = await getPendingOrdersGrouped(req.query);

    res.json({
      date: formatDateWIB(),
      lastUpdated: formatTimeWIB(),
      ...result
    });
  } catch (error) {
    next(error);
  }
}
