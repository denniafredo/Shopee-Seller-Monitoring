import 'dotenv/config';

import app from './app.js';
import { startShopeeTokenAutoRefresh } from './clients/shopee.client.js';

const PORT = process.env.PORT || 3000;

startShopeeTokenAutoRefresh();

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
