# Graph Report - Shopee Monitoring  (2026-10-08)

## Corpus Check
- 30 files · ~9,534 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 8 file(s) not represented in the graph (top: (none) 4, .example 2, .zip 1)

## Summary
- 48 nodes · 69 edges · 6 communities
- Extraction: 96% EXTRACTED · 4% INFERRED · 0% AMBIGUOUS · INFERRED: 3 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `d56f2486`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- shopeeOrder.service.js
- OrderTable.jsx
- normalizeShopeeOrder
- getShopeeOrdersWithDetails
- getPendingOrdersForDisplay
- OrderIcons.jsx

## God Nodes (most connected - your core abstractions)
1. `normalizeShopeeOrder()` - 10 edges
2. `getShopeeOrdersWithDetails()` - 7 edges
3. `getPendingOrdersForDisplay()` - 5 edges
4. `getPendingOrders()` - 3 edges
5. `getOrderDetail()` - 3 edges
6. `getPendingOrdersGrouped()` - 3 edges
7. `getOptionalFields()` - 3 edges
8. `formatOrderForTable()` - 3 edges
9. `getDashboardSummary()` - 2 edges
10. `syncShopeeOrdersFromApi()` - 2 edges

## Surprising Connections (you probably didn't know these)
- `getShopeeOrdersWithDetails()` --indirect_call--> `normalizeShopeeOrder()`  [INFERRED]
  backend/src/services/shopeeOrder.service.js → backend/src/services/shopeeOrder.service.js  _Bridges community 3 → community 2_
- `getPendingOrdersForDisplay()` --calls--> `getShopeeOrdersWithDetails()`  [EXTRACTED]
  backend/src/services/shopeeOrder.service.js → backend/src/services/shopeeOrder.service.js  _Bridges community 3 → community 4_

## Import Cycles
- None detected.

## Communities (6 total, 0 thin omitted)

### Community 0 - "shopeeOrder.service.js"
Cohesion: 0.12
Nodes (14): backend_src_clients_shopee_client, backend_src_clients_shopee_client_getshopeecredential, backend_src_clients_shopee_client_refreshaccesstoken, backend_src_clients_shopee_client_shopeeget, backend_src_constants_order_constant, backend_src_constants_order_constant_order_status, backend_src_constants_order_constant_pending_statuses, backend_src_constants_order_constant_shipping_type (+6 more)

### Community 1 - "OrderTable.jsx"
Cohesion: 0.22
Nodes (6): frontend_src_components_productimage, frontend_src_components_statusbadge, frontend_src_utils_format, frontend_src_utils_format_formatvarianttext, frontend_src_utils_format_getdisplayimage, frontend_src_utils_format_normalizetime

### Community 2 - "normalizeShopeeOrder"
Cohesion: 0.25
Nodes (8): buildRecipientAddress(), getShippingDeadlineText(), getShopeeProductImageUrl(), getShopeeVariantImageUrl(), mapShippingType(), mapShopeeStatus(), normalizeNote(), normalizeShopeeOrder()

### Community 3 - "getShopeeOrdersWithDetails"
Cohesion: 0.33
Nodes (6): buildTimeRanges(), chunkArray(), getOptionalFields(), getOrderDetail(), getShopeeOrdersWithDetails(), syncShopeeOrdersFromApi()

### Community 4 - "getPendingOrdersForDisplay"
Cohesion: 0.50
Nodes (5): formatOrderForTable(), getDashboardSummary(), getPendingOrders(), getPendingOrdersForDisplay(), getPendingOrdersGrouped()

### Community 5 - "OrderIcons.jsx"
Cohesion: 0.50
Nodes (3): MoneyIcon(), NoteIcon(), OrderIcon()

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `normalizeShopeeOrder()` connect `normalizeShopeeOrder` to `shopeeOrder.service.js`, `getShopeeOrdersWithDetails`?**
  _High betweenness centrality (0.016) - this node is a cross-community bridge._
- **Why does `getShopeeOrdersWithDetails()` connect `getShopeeOrdersWithDetails` to `shopeeOrder.service.js`, `normalizeShopeeOrder`, `getPendingOrdersForDisplay`?**
  _High betweenness centrality (0.007) - this node is a cross-community bridge._
- **Why does `getPendingOrdersForDisplay()` connect `getPendingOrdersForDisplay` to `shopeeOrder.service.js`, `getShopeeOrdersWithDetails`?**
  _High betweenness centrality (0.003) - this node is a cross-community bridge._
- **Should `shopeeOrder.service.js` be split into smaller, more focused modules?**
  _Cohesion score 0.125 - nodes in this community are weakly interconnected._