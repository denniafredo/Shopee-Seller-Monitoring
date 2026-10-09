import 'dotenv/config';

import app from './app.js';
import { startShopeeTokenAutoRefresh } from './clients/shopee.client.js';
import { startQrisAutoRefresh } from './services/bcaQris.service.js';
import { startCustomerHistoryAutoRefresh } from './services/customerHistory.service.js';

const PORT = process.env.PORT || 3000;

startShopeeTokenAutoRefresh();
startQrisAutoRefresh();
startCustomerHistoryAutoRefresh();

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
