import 'dotenv/config';

import app from './app.js';
import { startShopeeTokenAutoRefresh } from './clients/shopee.client.js';
import { startQrisAutoRefresh } from './services/bcaQris.service.js';

const PORT = process.env.PORT || 3000;

startShopeeTokenAutoRefresh();
startQrisAutoRefresh();

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
