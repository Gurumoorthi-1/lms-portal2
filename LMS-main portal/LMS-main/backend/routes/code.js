import express from 'express';
import { runCode } from '../controllers/codeController.js';
import { protect } from '../middleware/auth.js';
const router = express.Router();
router.post('/run', protect, runCode);
export default router;
