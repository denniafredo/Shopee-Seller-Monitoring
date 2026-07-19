import { shopeeGet, getShopeeCredential, refreshAccessToken } from '../clients/shopee.client.js';
import { ORDER_STATUS, PENDING_STATUSES, SHIPPING_TYPE } from '../constants/order.constant.js';
import { formatTimeWIB, getTodayUnixRangeWIB } from '../utils/date.util.js';
import { getShopeeTokens, persistShopeeTokens } from '../utils/shopeeTokenStore.js';

const DEFAULT_ORDER_LOOKBACK_DAYS = 5;
const DEFAULT_PENDING_LOOKBACK_DAYS = 5;
const MAX_ORDER_LIST_RANGE_DAYS = 15;

export async function getDashboardSummary(params = {}) {
  const pendingOrders = await getPendingOrdersForDisplay(params);

  const countMap = pendingOrders.reduce((acc, order) => {
    acc[order.shippingType] = (acc[order.shippingType] || 0) + 1;
    return acc;
  }, {});

  return [
    {
      type: SHIPPING_TYPE.INSTANT,
      label: 'Instant',
      pendingCount: countMap[SHIPPING_TYPE.INSTANT] || 0,
      priority: 'high'
    },
    {
      type: SHIPPING_TYPE.SAMEDAY,
      label: 'Sameday',
      pendingCount: countMap[SHIPPING_TYPE.SAMEDAY] || 0,
      priority: 'medium'
    },
    {
      type: SHIPPING_TYPE.CARGO,
      label: 'Cargo',
      pendingCount: countMap[SHIPPING_TYPE.CARGO] || 0,
      priority: 'normal'
    },
    {
      type: SHIPPING_TYPE.REGULER,
      label: 'Reguler',
      pendingCount: countMap[SHIPPING_TYPE.REGULER] || 0,
      priority: 'normal'
    }
  ];
}

export async function getPendingOrders(params = {}) {
  const page = Number(params.page || 1);
  const limit = Number(params.limit || 20);
  const shippingType = params.shippingType || null;
  const status = params.status || null;

  let orders = await getPendingOrdersForDisplay(params);

  const total = orders.length;
  const start = (page - 1) * limit;
  const pagedOrders = orders.slice(start, start + limit);

  return {
    total,
    page,
    limit,
    orders: pagedOrders.map(formatOrderForTable)
  };
}

export async function getOrderDetail(orderNo) {
  const { shopId, accessToken } = getShopeeCredential();

  const response = await shopeeGet({
    path: '/api/v2/order/get_order_detail',
    accessToken,
    shopId,
    params: {
      order_sn_list: orderNo,
      response_optional_fields: getOptionalFields()
    }
  });

  if (response.error) {
    const error = new Error(response.message || response.error);
    error.statusCode = 400;
    error.data = response;
    throw error;
  }

  const shopeeOrder = response.response?.order_list?.[0];

  if (!shopeeOrder) {
    const error = new Error('Order not found from Shopee API');
    error.statusCode = 404;
    throw error;
  }

  return normalizeShopeeOrder(shopeeOrder);
}

export async function syncShopeeOrdersFromApi(params = {}) {
  // No database version: this endpoint only calls Shopee API and returns normalized data.
  const orders = await getShopeeOrdersWithDetails(params);

  return {
    success: true,
    message: 'Orders fetched directly from Shopee API. No local database is used.',
    total: orders.length,
    orders
  };
}

export async function refreshShopeeTokenFromEnv() {
  const { refreshToken, shopId } = getShopeeTokens();

  if (!refreshToken || !shopId) {
    const error = new Error('SHOPEE_REFRESH_TOKEN or SHOPEE_SHOP_ID is missing');
    error.statusCode = 400;
    throw error;
  }

  const result = await refreshAccessToken({ refreshToken, shopId });
  const newAccessToken = result.access_token || result.accessToken;
  const newRefreshToken = result.refresh_token || result.refreshToken;

  if (newAccessToken) {
    await persistShopeeTokens({
      accessToken: newAccessToken,
      refreshToken: newRefreshToken || refreshToken
    });
  }
  console.log('Token refresh result:', result);
  return result;
}

async function getShopeeOrdersWithDetails(params = {}) {
  const { shopId, accessToken } = getShopeeCredential();
  const now = Math.floor(Date.now() / 1000);
  const explicitTimeFrom = params.timeFrom || params.time_from;
  const explicitTimeTo = params.timeTo || params.time_to;
  const lookbackDays = Number(
    params.lookbackDays ||
    params.lookback_days ||
    process.env.SHOPEE_ORDER_LOOKBACK_DAYS ||
    DEFAULT_ORDER_LOOKBACK_DAYS
  );
  const defaultTimeFrom = now - lookbackDays * 24 * 60 * 60;

  const timeFrom = Number(explicitTimeFrom || defaultTimeFrom);
  const timeTo = Number(explicitTimeTo || now);
  const pageSize = Number(params.pageSize || params.page_size || 50);
  const timeRangeField = params.timeRangeField || params.time_range_field || 'create_time';
  const timeRanges = buildTimeRanges({ timeFrom, timeTo });

  const allOrderSn = new Set();

  for (const range of timeRanges) {
    let cursor = '';
    let hasMore = true;

    while (hasMore) {
      const listResponse = await shopeeGet({
        path: '/api/v2/order/get_order_list',
        accessToken,
        shopId,
        params: {
          time_range_field: timeRangeField,
          time_from: range.timeFrom,
          time_to: range.timeTo,
          page_size: pageSize,
          cursor
        }
      });

      if (listResponse.error) {
        const error = new Error(listResponse.message || listResponse.error);
        error.statusCode = 400;
        error.data = listResponse;
        throw error;
      }

      const response = listResponse.response || {};
      const orderList = response.order_list || [];
      orderList
        .map((order) => order.order_sn)
        .filter(Boolean)
        .forEach((orderSn) => allOrderSn.add(orderSn));

      hasMore = Boolean(response.more);
      cursor = response.next_cursor || '';

      if (!cursor) hasMore = false;
    }
  }

  const orderSnList = [...allOrderSn];

  if (orderSnList.length === 0) return [];

  const detailChunks = chunkArray(orderSnList, 50);
  const details = [];

  for (const chunk of detailChunks) {
    const detailResponse = await shopeeGet({
      path: '/api/v2/order/get_order_detail',
      accessToken,
      shopId,
      params: {
        order_sn_list: chunk.join(','),
        response_optional_fields: getOptionalFields()
      }
    });

    if (detailResponse.error) {
      const error = new Error(detailResponse.message || detailResponse.error);
      error.statusCode = 400;
      error.data = detailResponse;
      throw error;
    }

    details.push(...(detailResponse.response?.order_list || []));
  }

  return details
    .map(normalizeShopeeOrder)
    .filter(Boolean)
    .sort((a, b) => new Date(b.orderTime) - new Date(a.orderTime));
}

export async function getPendingOrdersGrouped(params = {}) {
  const orders = await getPendingOrdersForDisplay(params);
  const formattedOrders = orders.map(formatOrderForTable);

  const fastDeliveryTypes = ['INSTANT', 'SAMEDAY'];
  const standardDeliveryTypes = ['CARGO', 'REGULER'];

  const fastDeliveryOrders = formattedOrders.filter((order) =>
    fastDeliveryTypes.includes(order.shippingType)
  );

  const standardDeliveryOrders = formattedOrders.filter((order) =>
    standardDeliveryTypes.includes(order.shippingType)
  );

  return {
    total: formattedOrders.length,
    tables: {
      fastDelivery: {
        label: 'Instant & Sameday',
        shippingTypes: fastDeliveryTypes,
        total: fastDeliveryOrders.length,
        orders: fastDeliveryOrders
      },
      standardDelivery: {
        label: 'Cargo & Reguler',
        shippingTypes: standardDeliveryTypes,
        total: standardDeliveryOrders.length,
        orders: standardDeliveryOrders
      }
    }
  };
}

async function getPendingOrdersForDisplay(params = {}) {
  const shippingType = params.shippingType || null;
  const status = params.status || null;
  const pendingLookbackDays = Number(
    params.pendingLookbackDays ||
    params.pending_lookback_days ||
    params.lookbackDays ||
    params.lookback_days ||
    process.env.SHOPEE_PENDING_LOOKBACK_DAYS ||
    DEFAULT_PENDING_LOOKBACK_DAYS
  );

  let orders = await getShopeeOrdersWithDetails({
    ...params,
    lookbackDays: pendingLookbackDays
  });

  orders = orders.filter((order) =>
    PENDING_STATUSES.includes(order.status) &&
    order.paymentStatus === 'PAID' &&
    order.shopeeStatus !== 'UNPAID'
  );

  if (shippingType) {
    orders = orders.filter((order) => order.shippingType === shippingType);
  }

  if (status) {
    orders = orders.filter((order) => order.status === status);
  }

  orders.sort((a, b) => {
    const aIsNew = a.status === ORDER_STATUS.BARU;
    const bIsNew = b.status === ORDER_STATUS.BARU;

    if (aIsNew && !bIsNew) return -1;
    if (!aIsNew && bIsNew) return 1;

    const aTime = a.shipByTimestamp || Infinity;
    const bTime = b.shipByTimestamp || Infinity;
    return aTime - bTime;
  });

  return orders;
}

function getOptionalFields() {
  return [
    'buyer_user_id',
    'buyer_username',
    'recipient_address',
    'item_list',
    'package_list',
    'shipping_carrier',
    'payment_method',
    'total_amount',
    'order_status',
    'create_time',
    'update_time',
    'item_image',
    'image_info',
    'ship_by_date'
  ].join(',');
}

function normalizeShopeeOrder(order) {
  if (!order?.order_sn) return null;

  const recipient = order.recipient_address || {};
  const orderDate = order.create_time ? new Date(order.create_time * 1000) : new Date();

  return {
    orderNo: order.order_sn,
    buyerName: order.buyer_username || null,
    shippingType: mapShippingType(order.shipping_carrier),
    courierName: order.shipping_carrier || null,
    orderTime: orderDate.toISOString(),
    orderTimeText: formatTimeWIB(orderDate),
    shopeeStatus: order.order_status || null,
    status: mapShopeeStatus(order.order_status),
    shipByDate: order.ship_by_date
      ? new Date(order.ship_by_date * 1000)
      : null,
    shipByTimestamp: order.ship_by_date || null,
    shippingDeadlineText: getShippingDeadlineText(order.ship_by_date),
    paymentStatus: order.payment_method ? 'PAID' : null,
    paymentMethod: order.payment_method || null,
    totalAmount: order.total_amount ?? null,
    recipient: {
      name: recipient.name || null,
      phone: recipient.phone || null,
      address: buildRecipientAddress(recipient)
    },
    items: (order.item_list || []).map((item) => ({
      sku: item.item_sku || item.model_sku || null,
      productName: item.item_name || item.model_name || 'Unknown Product',
      modelName: item.model_name || null,
      variantName: item.model_name || null,
      qty: item.model_quantity_purchased || 1,
      price: item.model_discounted_price ? Number(item.model_discounted_price) : null,
      productImageUrl: getShopeeProductImageUrl(item),
      variantImageUrl: getShopeeVariantImageUrl(item),
      imageUrl: getShopeeVariantImageUrl(item) || getShopeeProductImageUrl(item)
    }))
  };
}

function getShopeeProductImageUrl(item) {
  return (
    item.image_info?.image_url ||
    item.image_info?.image_url_list?.[0] ||
    item.item_image ||
    item.image_url ||
    item.image ||
    null
  );
}

function getShopeeVariantImageUrl(item) {
  return (
    item.model_image ||
    item.model_image_url ||
    item.model_image_info?.image_url ||
    item.model_image_info?.image_url_list?.[0] ||
    null
  );
}

function formatOrderForTable(order) {
  return {
    orderNo: order.orderNo,
    shippingType: order.shippingType,
    orderTime: order.orderTimeText,
    status: order.status,
    shopeeStatus: order.shopeeStatus,
    courierName: order.courierName,
    shipByDate: order.shipByDate,
    shipByTimestamp: order.shipByTimestamp,
    shippingDeadlineText: order.shippingDeadlineText,
    items: order.items.map((item) => ({
      productName: item.productName,
      variantName: item.variantName,
      qty: item.qty,
      imageUrl: item.imageUrl
    }))
  };
}

function mapShopeeStatus(status) {
  const statusMap = {
    UNPAID: ORDER_STATUS.BARU,
    READY_TO_SHIP: ORDER_STATUS.BARU,
    PROCESSED: ORDER_STATUS.DIPROSES,
    RETRY_SHIP: ORDER_STATUS.DIPROSES,
    SHIPPED: ORDER_STATUS.DIKIRIM,
    TO_CONFIRM_RECEIVE: ORDER_STATUS.DIKIRIM,
    COMPLETED: ORDER_STATUS.SELESAI,
    IN_CANCEL: ORDER_STATUS.DIPROSES,
    CANCELLED: ORDER_STATUS.DIBATALKAN
  };

  return statusMap[status] || ORDER_STATUS.UNKNOWN;
}

function mapShippingType(courierName = '') {
  const name = String(courierName).toUpperCase();

  if (name.includes('INSTANT')) return SHIPPING_TYPE.INSTANT;
  if (name.includes('SAMEDAY') || name.includes('SAME DAY')) return SHIPPING_TYPE.SAMEDAY;
  if (name.includes('CARGO') || name.includes('TRUCKING') || name.includes('BIG')) return SHIPPING_TYPE.CARGO;

  return SHIPPING_TYPE.REGULER;
}

function buildRecipientAddress(recipient) {
  return [
    recipient.full_address,
    recipient.district,
    recipient.city,
    recipient.state,
    recipient.zipcode
  ]
    .filter(Boolean)
    .join(', ');
}

function chunkArray(array, size) {
  const chunks = [];

  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }

  return chunks;
}

function buildTimeRanges({ timeFrom, timeTo }) {
  const maxRangeSeconds = MAX_ORDER_LIST_RANGE_DAYS * 24 * 60 * 60;
  const ranges = [];
  let rangeTo = timeTo;

  while (rangeTo >= timeFrom) {
    const rangeFrom = Math.max(timeFrom, rangeTo - maxRangeSeconds + 1);

    ranges.push({
      timeFrom: rangeFrom,
      timeTo: rangeTo
    });

    rangeTo = rangeFrom - 1;
  }

  return ranges;
}

function getShippingDeadlineText(shipByTimestamp) {
  if (!shipByTimestamp) {
    return null;
  }

  const now = Math.floor(Date.now() / 1000);
  const diffSeconds = shipByTimestamp - now;

  if (diffSeconds <= 0) {
    return 'Lewat batas pengiriman';
  }

  const totalMinutes = Math.floor(diffSeconds / 60);
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;

  if (days > 0) {
    return `Kirim dalam ${days} hari ${hours} jam ${minutes} menit`;
  }

  if (hours > 0) {
    return `Kirim dalam ${hours} jam ${minutes} menit`;
  }

  return `Kirim dalam ${minutes} menit`;
}
