import Problem from '../models/Problem.js';

export const getProblemsByTopic = async (req, res) => {
  try {
    const problems = await Problem.find({ topicId: req.params.topicId }).sort('order');
    res.json(problems);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const getProblem = async (req, res) => {
  try {
    const problem = await Problem.findById(req.params.id);
    if (!problem) return res.status(404).json({ message: 'Problem not found' });
    res.json(problem);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
