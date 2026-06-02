import crypto from 'crypto';
import axios from 'axios';
import { getShopeeTokens, persistShopeeTokens } from '../utils/shopeeTokenStore.js';

const SHOPEE_HOST = process.env.SHOPEE_HOST;
const PARTNER_ID = Number(process.env.SHOPEE_PARTNER_ID);
const PARTNER_KEY = process.env.SHOPEE_PARTNER_KEY;
const REDIRECT_URL = process.env.SHOPEE_REDIRECT_URL;

function getTimestamp() {
  return Math.floor(Date.now() / 1000);
}

function assertBaseConfig() {
  if (!SHOPEE_HOST) throw new Error('SHOPEE_HOST is missing');
  if (!PARTNER_ID) throw new Error('SHOPEE_PARTNER_ID is missing');
  if (!PARTNER_KEY) throw new Error('SHOPEE_PARTNER_KEY is missing');
}

function generateSign({ path, timestamp, accessToken, shopId }) {
  assertBaseConfig();

  // Public API sign: partner_id + path + timestamp
  // Shop API sign: partner_id + path + timestamp + access_token + shop_id
  let baseString = `${PARTNER_ID}${path}${timestamp}`;

  if (accessToken && shopId) {
    baseString += `${accessToken}${shopId}`;
  }

  return crypto
    .createHmac('sha256', PARTNER_KEY)
    .update(baseString)
    .digest('hex');
}

function buildUrl({ path, accessToken, shopId, extraQuery = {} }) {
  const timestamp = getTimestamp();
  const sign = generateSign({ path, timestamp, accessToken, shopId });

  const query = new URLSearchParams({
    partner_id: String(PARTNER_ID),
    timestamp: String(timestamp),
    sign
  });

  for (const [key, value] of Object.entries(extraQuery)) {
    if (value !== undefined && value !== null && value !== '') {
      query.append(key, String(value));
    }
  }

  if (accessToken) query.append('access_token', accessToken);
  if (shopId) query.append('shop_id', String(shopId));

  return `${SHOPEE_HOST}${path}?${query.toString()}`;
}

export function getShopeeAuthUrl() {
  const path = '/api/v2/shop/auth_partner';
  const timestamp = getTimestamp();
  const sign = generateSign({ path, timestamp });

  const query = new URLSearchParams({
    partner_id: String(PARTNER_ID),
    timestamp: String(timestamp),
    sign,
    redirect: REDIRECT_URL
  });

  return `${SHOPEE_HOST}${path}?${query.toString()}`;
}

export async function getAccessToken({ code, shopId }) {
  const path = '/api/v2/auth/token/get';
  const url = buildUrl({ path });

  const response = await axios.post(url, {
    code,
    shop_id: Number(shopId),
    partner_id: PARTNER_ID
  });

  return response.data;
}

export async function refreshAccessToken({ refreshToken, shopId }) {
  const path = '/api/v2/auth/access_token/get';
  const url = buildUrl({ path });

  const response = await axios.post(url, {
    refresh_token: refreshToken,
    shop_id: Number(shopId),
    partner_id: PARTNER_ID
  });

  return response.data;
}

function isInvalidTokenError(data, status) {
  const message = (data?.message || data?.error || '').toString().toLowerCase();

  return (
    status === 401 ||
    message.includes('invalid token') ||
    message.includes('access token expired') ||
    message.includes('invalid access token') ||
    message.includes('access_token is invalid')
  );
}

async function autoRefreshShopeeToken() {
  const { refreshToken, shopId } = getShopeeTokens();

  if (!refreshToken || !shopId) {
    const error = new Error('SHOPEE_REFRESH_TOKEN or SHOPEE_SHOP_ID is missing for token refresh');
    error.statusCode = 400;
    throw error;
  }

  const result = await refreshAccessToken({ refreshToken, shopId });
  const newAccessToken = result.access_token || result.accessToken;
  const newRefreshToken = result.refresh_token || result.refreshToken;

  if (!newAccessToken) {
    const error = new Error('Shopee refresh response did not return a new access token');
    error.statusCode = 500;
    throw error;
  }

  await persistShopeeTokens({
    accessToken: newAccessToken,
    refreshToken: newRefreshToken || refreshToken
  });

  return {
    accessToken: newAccessToken,
    refreshToken: newRefreshToken || refreshToken,
    shopId
  };
}

export async function shopeeGet({ path, accessToken, shopId, params = {} }) {
  const currentTokens = getShopeeTokens();
  accessToken = accessToken || currentTokens.accessToken;
  shopId = shopId || currentTokens.shopId;

  const doRequest = async (token) => {
    const url = buildUrl({ path, accessToken: token, shopId, extraQuery: params });
    const response = await axios.get(url);

    if (isInvalidTokenError(response.data, response.status)) {
      throw {
        isShopeeInvalidToken: true,
        response: { data: response.data, status: response.status }
      };
    }

    return response.data;
  };

  try {
    return await doRequest(accessToken);
  } catch (error) {
    const isInvalid =
      error.isShopeeInvalidToken ||
      isInvalidTokenError(error.response?.data, error.response?.status);

    if (isInvalid) {
      console.warn('Shopee access token invalid; refreshing automatically');
      const refreshed = await autoRefreshShopeeToken();
      try {
        return await doRequest(refreshed.accessToken);
      } catch (secondError) {
        const secondData = secondError.response?.data || secondError;
        console.error('Shopee API retry after refresh failed:', secondData);
        const err = new Error(secondData?.message || secondData?.error || 'Shopee API retry after refresh failed');
        err.statusCode = secondError.response?.status || 500;
        err.data = secondData;
        throw err;
      }
    }

    const data = error.response?.data;
    console.error('Shopee API Error:', data || error.message);

    const err = new Error(data?.message || data?.error || 'Shopee API request failed');
    err.statusCode = error.response?.status || 500;
    err.data = data;
    throw err;
  }
}

export function getShopeeCredential() {
  const { shopId, accessToken, refreshToken } = getShopeeTokens();

  if (!shopId) {
    const error = new Error('SHOPEE_SHOP_ID is missing');
    error.statusCode = 400;
    throw error;
  }

  if (!accessToken) {
    const error = new Error('SHOPEE_ACCESS_TOKEN is missing');
    error.statusCode = 400;
    throw error;
  }

  return { shopId, accessToken, refreshToken };
}
