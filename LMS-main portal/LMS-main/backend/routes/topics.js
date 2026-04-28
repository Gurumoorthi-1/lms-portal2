import express from 'express';
import { getTopicsByCourse } from '../controllers/topicController.js';
const router = express.Router();
router.get('/:courseId', getTopicsByCourse);
export default router;
