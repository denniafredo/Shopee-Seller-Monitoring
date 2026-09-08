import express from 'express';
import { qrisSettlement, qrisRefresh } from '../controllers/bcaQris.controller.js';

const router = express.Router();

router.get('/settlement', qrisSettlement);
router.post('/refresh', qrisRefresh);

export default router;
