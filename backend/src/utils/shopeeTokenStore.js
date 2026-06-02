import fs from 'fs/promises';
import path from 'path';

const envFilePath = path.resolve(process.cwd(), '.env');

let tokenCache = {
  accessToken: process.env.SHOPEE_ACCESS_TOKEN,
  refreshToken: process.env.SHOPEE_REFRESH_TOKEN,
  shopId: Number(process.env.SHOPEE_SHOP_ID)
};

export function getShopeeTokens() {
  return {
    accessToken: tokenCache.accessToken,
    refreshToken: tokenCache.refreshToken,
    shopId: tokenCache.shopId
  };
}

async function writeEnvFile(updates) {
  const raw = await fs.readFile(envFilePath, 'utf8').catch(() => '');
  const lines = raw.split(/\r?\n/);
  const resultLines = lines.map((line) => {
    if (line.startsWith('SHOPEE_ACCESS_TOKEN=')) {
      return updates.SHOPEE_ACCESS_TOKEN ?? line;
    }

    if (line.startsWith('SHOPEE_REFRESH_TOKEN=')) {
      return updates.SHOPEE_REFRESH_TOKEN ?? line;
    }

    if (line.startsWith('SHOPEE_SHOP_ID=')) {
      return updates.SHOPEE_SHOP_ID ?? line;
    }

    return line;
  });

  if (updates.SHOPEE_ACCESS_TOKEN && !lines.some((line) => line.startsWith('SHOPEE_ACCESS_TOKEN='))) {
    resultLines.push(`SHOPEE_ACCESS_TOKEN=${updates.SHOPEE_ACCESS_TOKEN}`);
  }
  if (updates.SHOPEE_REFRESH_TOKEN && !lines.some((line) => line.startsWith('SHOPEE_REFRESH_TOKEN='))) {
    resultLines.push(`SHOPEE_REFRESH_TOKEN=${updates.SHOPEE_REFRESH_TOKEN}`);
  }
  if (updates.SHOPEE_SHOP_ID && !lines.some((line) => line.startsWith('SHOPEE_SHOP_ID='))) {
    resultLines.push(`SHOPEE_SHOP_ID=${updates.SHOPEE_SHOP_ID}`);
  }

  await fs.writeFile(envFilePath, resultLines.join('\n'), 'utf8');
}

export async function persistShopeeTokens({ accessToken, refreshToken, shopId }) {
  if (!accessToken && !refreshToken && !shopId) return;

  if (accessToken) {
    tokenCache.accessToken = accessToken;
    process.env.SHOPEE_ACCESS_TOKEN = accessToken;
  }

  if (refreshToken) {
    tokenCache.refreshToken = refreshToken;
    process.env.SHOPEE_REFRESH_TOKEN = refreshToken;
  }

  if (shopId !== undefined && shopId !== null) {
    tokenCache.shopId = Number(shopId);
    process.env.SHOPEE_SHOP_ID = String(shopId);
  }

  await writeEnvFile({
    ...(accessToken ? { SHOPEE_ACCESS_TOKEN: accessToken } : {}),
    ...(refreshToken ? { SHOPEE_REFRESH_TOKEN: refreshToken } : {}),
    ...(shopId !== undefined && shopId !== null ? { SHOPEE_SHOP_ID: shopId } : {})
  });
}
