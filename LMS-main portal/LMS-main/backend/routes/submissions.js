import express from 'express';
import { submitCode, getSubmissions } from '../controllers/submissionController.js';
import { protect } from '../middleware/auth.js';
const router = express.Router();
router.post('/', protect, submitCode);
router.get('/', protect, getSubmissions);
export default router;
