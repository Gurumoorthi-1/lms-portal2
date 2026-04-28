import express from 'express';
import { getProblemsByTopic, getProblem } from '../controllers/problemController.js';
const router = express.Router();
router.get('/topic/:topicId', getProblemsByTopic);
router.get('/:id', getProblem);
export default router;
