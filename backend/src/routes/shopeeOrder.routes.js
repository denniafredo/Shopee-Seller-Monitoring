import express from 'express';
import {
  authShopee,
  shopeeAuthCallback,
  refreshToken,
  todayRange,
  dashboardSummary,
  pendingOrders,
  orderDetail,
  changeOrderStatus,
  syncOrders,
  pendingOrdersGrouped,
} from '../controllers/shopeeOrder.controller.js';

const router = express.Router();

router.get('/auth', authShopee);
router.get('/auth/callback', shopeeAuthCallback);
router.post('/auth/refresh-token', refreshToken);
router.get('/today-range', todayRange);

router.get('/orders/dashboard-summary', dashboardSummary);
router.get('/orders/pending', pendingOrders);
router.get('/orders/pending/grouped', pendingOrdersGrouped);
router.get('/orders/:orderNo', orderDetail);
router.patch('/orders/:orderNo/status', changeOrderStatus);
router.post('/sync-orders', syncOrders);

export default router;
