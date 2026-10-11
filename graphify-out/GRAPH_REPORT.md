# Graph Report - Shopee Monitoring  (2026-10-11)

## Corpus Check
- 33 files · ~11,619 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 8 file(s) not represented in the graph (top: (none) 4, .example 2, .zip 1)

## Summary
- 131 nodes · 252 edges · 13 communities
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 7 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `107eaae5`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- shopeeOrder.service.js
- OrderTable.jsx
- normalizeShopeeOrder
- getShopeeOrdersWithDetails
- getPendingOrdersForDisplay
- customerHistory.service.js
- server.js
- syncOrders
- buildCustomerStatus
- tick
- order.constant.js
- rememberOrders
- bcaQris.client.js

## God Nodes (most connected - your core abstractions)
1. `ensureLoggedIn()` - 10 edges
2. `normalizeShopeeOrder()` - 10 edges
3. `fetchQrisSettlement()` - 7 edges
4. `getShopeeOrdersWithDetails()` - 7 edges
5. `getPendingOrdersForDisplay()` - 7 edges
6. `syncOrders()` - 6 edges
7. `buildTimeRanges()` - 6 edges
8. `tick()` - 6 edges
9. `scrapeHomePage()` - 5 edges
10. `parseSettlementText()` - 5 edges

## Surprising Connections (you probably didn't know these)
- `getPendingOrdersForDisplay()` --calls--> `rememberOrders()`  [EXTRACTED]
  backend/src/services/shopeeOrder.service.js → backend/src/services/customerHistory.service.js
- `getShopeeOrdersWithDetails()` --calls--> `buildTimeRanges()`  [EXTRACTED]
  backend/src/services/shopeeOrder.service.js → backend/src/utils/range.util.js
- `getShopeeOrdersWithDetails()` --calls--> `chunkArray()`  [EXTRACTED]
  backend/src/services/shopeeOrder.service.js → backend/src/utils/range.util.js
- `getPendingOrdersForDisplay()` --calls--> `withCustomerStatus()`  [EXTRACTED]
  backend/src/services/shopeeOrder.service.js → backend/src/services/customerHistory.service.js
- `CustomerStatusBadge()` --calls--> `formatShortDate()`  [EXTRACTED]
  frontend/src/components/CustomerStatusBadge.jsx → frontend/src/utils/format.js

## Import Cycles
- None detected.

## Communities (13 total, 0 thin omitted)

### Community 0 - "shopeeOrder.service.js"
Cohesion: 0.18
Nodes (9): backend_src_clients_shopee_client_getshopeecredential, backend_src_clients_shopee_client_refreshaccesstoken, backend_src_clients_shopee_client_shopeeget, backend_src_utils_date_util, backend_src_utils_date_util_formattimewib, backend_src_utils_date_util_gettodayunixrangewib, backend_src_utils_shopeetokenstore, backend_src_utils_shopeetokenstore_getshopeetokens (+1 more)

### Community 1 - "OrderTable.jsx"
Cohesion: 0.16
Nodes (13): CustomerStatusBadge(), MoneyIcon(), NoteIcon(), OrderIcon(), OrderRow(), frontend_src_components_productimage, frontend_src_components_statusbadge, formatShortDate() (+5 more)

### Community 2 - "normalizeShopeeOrder"
Cohesion: 0.25
Nodes (8): buildRecipientAddress(), getShippingDeadlineText(), getShopeeProductImageUrl(), getShopeeVariantImageUrl(), mapShippingType(), mapShopeeStatus(), normalizeNote(), normalizeShopeeOrder()

### Community 3 - "getShopeeOrdersWithDetails"
Cohesion: 0.50
Nodes (4): getOptionalFields(), getOrderDetail(), getShopeeOrdersWithDetails(), syncShopeeOrdersFromApi()

### Community 4 - "getPendingOrdersForDisplay"
Cohesion: 0.50
Nodes (5): formatOrderForTable(), getDashboardSummary(), getPendingOrders(), getPendingOrdersForDisplay(), getPendingOrdersGrouped()

### Community 5 - "customerHistory.service.js"
Cohesion: 0.20
Nodes (9): DATA_DIR, IGNORED_ORDER_STATUSES, IGNORED_RETURN_STATUSES, orderIndex, RETURN_REASON_LABELS, returnIndex, ref_fs, ref_path (+1 more)

### Community 6 - "server.js"
Cohesion: 0.29
Nodes (6): backend_src_app, backend_src_clients_shopee_client, backend_src_clients_shopee_client_startshopeetokenautorefresh, backend_src_services_bcaqris_service, backend_src_services_bcaqris_service_startqrisautorefresh, ref_dotenv

### Community 7 - "syncOrders"
Cohesion: 0.38
Nodes (6): callShopee(), normalizeReturn(), syncOrders(), syncReturns(), buildTimeRanges(), chunkArray()

### Community 8 - "buildCustomerStatus"
Cohesion: 0.47
Nodes (6): buildCustomerStatus(), findBuyerItems(), getBuyerKeys(), getReturnReasonLabel(), groupByBuyer(), withCustomerStatus()

### Community 9 - "tick"
Cohesion: 0.33
Nodes (9): backfillNextChunk(), getHistoryDays(), getRefreshMs(), getTargetSince(), isEnabled(), startCustomerHistoryAutoRefresh(), syncRange(), syncRecent() (+1 more)

### Community 10 - "order.constant.js"
Cohesion: 0.40
Nodes (4): CUSTOMER_STATUS, ORDER_STATUS, PENDING_STATUSES, SHIPPING_TYPE

### Community 11 - "rememberOrders"
Cohesion: 0.40
Nodes (5): getHistoryFilePath(), loadHistoryFile(), rememberOrders(), saveHistoryFile(), setOrderEntry()

### Community 12 - "bcaQris.client.js"
Cohesion: 0.12
Nodes (31): amountAnchored(), assertDiskSpace(), buildFromRrn(), CHROME_CANDIDATES, clearSession(), clickLoginButton(), closeBrowser(), DEBUG_DIR (+23 more)

## Knowledge Gaps
- **11 isolated node(s):** `MID`, `MIN_FREE_DISK_MB`, `SESSION_DIR`, `DEBUG_DIR`, `CHROME_CANDIDATES` (+6 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 35 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `rememberOrders()` connect `rememberOrders` to `shopeeOrder.service.js`, `tick`, `getPendingOrdersForDisplay`, `customerHistory.service.js`?**
  _High betweenness centrality (0.006) - this node is a cross-community bridge._
- **Why does `withCustomerStatus()` connect `buildCustomerStatus` to `shopeeOrder.service.js`, `getPendingOrdersForDisplay`, `customerHistory.service.js`?**
  _High betweenness centrality (0.006) - this node is a cross-community bridge._
- **Why does `buildTimeRanges()` connect `syncOrders` to `shopeeOrder.service.js`, `getShopeeOrdersWithDetails`, `customerHistory.service.js`?**
  _High betweenness centrality (0.006) - this node is a cross-community bridge._
- **What connects `MID`, `MIN_FREE_DISK_MB`, `SESSION_DIR` to the rest of the system?**
  _11 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `bcaQris.client.js` be split into smaller, more focused modules?**
  _Cohesion score 0.125 - nodes in this community are weakly interconnected._