# Graph Report - Shopee Monitoring  (2026-10-09)

## Corpus Check
- 33 files · ~11,296 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 8 file(s) not represented in the graph (top: (none) 4, .example 2, .zip 1)

## Summary
- 95 nodes · 177 edges · 12 communities
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 5 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `ecc1781d`
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
- syncOrderIndex
- buildCustomerStatus
- refreshCustomerHistory
- order.constant.js
- rememberOrders

## God Nodes (most connected - your core abstractions)
1. `normalizeShopeeOrder()` - 10 edges
2. `getShopeeOrdersWithDetails()` - 7 edges
3. `getPendingOrdersForDisplay()` - 7 edges
4. `refreshCustomerHistory()` - 6 edges
5. `syncOrderIndex()` - 6 edges
6. `buildTimeRanges()` - 6 edges
7. `startCustomerHistoryAutoRefresh()` - 5 edges
8. `rememberOrders()` - 5 edges
9. `withCustomerStatus()` - 5 edges
10. `buildCustomerStatus()` - 5 edges

## Surprising Connections (you probably didn't know these)
- `getPendingOrdersForDisplay()` --calls--> `rememberOrders()`  [EXTRACTED]
  backend/src/services/shopeeOrder.service.js → backend/src/services/customerHistory.service.js
- `getPendingOrdersForDisplay()` --calls--> `withCustomerStatus()`  [EXTRACTED]
  backend/src/services/shopeeOrder.service.js → backend/src/services/customerHistory.service.js
- `getShopeeOrdersWithDetails()` --calls--> `buildTimeRanges()`  [EXTRACTED]
  backend/src/services/shopeeOrder.service.js → backend/src/utils/range.util.js
- `getShopeeOrdersWithDetails()` --calls--> `chunkArray()`  [EXTRACTED]
  backend/src/services/shopeeOrder.service.js → backend/src/utils/range.util.js
- `syncOrderIndex()` --calls--> `buildTimeRanges()`  [EXTRACTED]
  backend/src/services/customerHistory.service.js → backend/src/utils/range.util.js

## Import Cycles
- None detected.

## Communities (12 total, 0 thin omitted)

### Community 0 - "shopeeOrder.service.js"
Cohesion: 0.18
Nodes (9): backend_src_clients_shopee_client_getshopeecredential, backend_src_clients_shopee_client_refreshaccesstoken, backend_src_clients_shopee_client_shopeeget, backend_src_utils_date_util, backend_src_utils_date_util_formattimewib, backend_src_utils_date_util_gettodayunixrangewib, backend_src_utils_shopeetokenstore, backend_src_utils_shopeetokenstore_getshopeetokens (+1 more)

### Community 1 - "OrderTable.jsx"
Cohesion: 0.17
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

### Community 7 - "syncOrderIndex"
Cohesion: 0.38
Nodes (6): callShopee(), normalizeReturn(), syncOrderIndex(), syncReturns(), buildTimeRanges(), chunkArray()

### Community 8 - "buildCustomerStatus"
Cohesion: 0.47
Nodes (6): buildCustomerStatus(), findBuyerItems(), getBuyerKeys(), getReturnReasonLabel(), groupByBuyer(), withCustomerStatus()

### Community 9 - "refreshCustomerHistory"
Cohesion: 0.40
Nodes (6): getHistoryDays(), getRefreshMs(), isEnabled(), refreshCustomerHistory(), refreshIfDue(), startCustomerHistoryAutoRefresh()

### Community 10 - "order.constant.js"
Cohesion: 0.40
Nodes (4): CUSTOMER_STATUS, ORDER_STATUS, PENDING_STATUSES, SHIPPING_TYPE

### Community 11 - "rememberOrders"
Cohesion: 0.40
Nodes (5): getHistoryFilePath(), loadHistoryFile(), rememberOrders(), saveHistoryFile(), setOrderEntry()

## Knowledge Gaps
- **6 isolated node(s):** `DATA_DIR`, `IGNORED_ORDER_STATUSES`, `IGNORED_RETURN_STATUSES`, `RETURN_REASON_LABELS`, `orderIndex` (+1 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 28 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `rememberOrders()` connect `rememberOrders` to `shopeeOrder.service.js`, `refreshCustomerHistory`, `getPendingOrdersForDisplay`, `customerHistory.service.js`?**
  _High betweenness centrality (0.009) - this node is a cross-community bridge._
- **Why does `withCustomerStatus()` connect `buildCustomerStatus` to `shopeeOrder.service.js`, `getPendingOrdersForDisplay`, `customerHistory.service.js`?**
  _High betweenness centrality (0.009) - this node is a cross-community bridge._
- **Why does `buildTimeRanges()` connect `syncOrderIndex` to `shopeeOrder.service.js`, `getShopeeOrdersWithDetails`, `customerHistory.service.js`?**
  _High betweenness centrality (0.008) - this node is a cross-community bridge._
- **What connects `DATA_DIR`, `IGNORED_ORDER_STATUSES`, `IGNORED_RETURN_STATUSES` to the rest of the system?**
  _6 weakly-connected nodes found - possible documentation gaps or missing edges._