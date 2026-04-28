import Topic from '../models/Topic.js';

export const getTopicsByCourse = async (req, res) => {
  try {
    const topics = await Topic.find({ courseId: req.params.courseId }).sort('order');
    res.json(topics);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
