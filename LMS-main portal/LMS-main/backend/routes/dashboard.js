import express from 'express';
import { getDashboard, getCalendar } from '../controllers/dashboardController.js';
import { protect } from '../middleware/auth.js';
const router = express.Router();
router.get('/', protect, getDashboard);
router.get('/calendar', protect, getCalendar);
export default router;
