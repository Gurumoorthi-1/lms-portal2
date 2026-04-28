import Submission from '../models/Submission.js';
import Problem from '../models/Problem.js';

export const getDashboard = async (req, res) => {
  try {
    const userId = req.user._id;
    const submissions = await Submission.find({ userId });
    
    const accepted = submissions.filter(s => s.status === 'Accepted');
    const uniqueSolved = [...new Set(accepted.map(s => s.problemId.toString()))];
    
    const byDifficulty = { Easy: 0, Medium: 0, Hard: 0 };
    for (const sid of uniqueSolved) {
      const p = await Problem.findById(sid);
      if (p) byDifficulty[p.difficulty]++;
    }

    // Activity by day (last 52 weeks)
    const activityMap = {};
    submissions.forEach(s => {
      const day = new Date(s.submittedAt).toISOString().split('T')[0];
      activityMap[day] = (activityMap[day] || 0) + 1;
    });

    // By course
    const byCourse = {};
    for (const s of accepted) {
      const cid = s.courseId?.toString();
      if (cid) byCourse[cid] = (byCourse[cid] || 0) + 1;
    }

    res.json({
      totalSolved: uniqueSolved.length,
      totalSubmissions: submissions.length,
      acceptanceRate: submissions.length > 0 ? Math.round((accepted.length / submissions.length) * 100) : 0,
      byDifficulty,
      activityMap,
      byCourse,
      recentSubmissions: submissions.slice(-10).reverse()
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const getCalendar = async (req, res) => {
  try {
    const userId = req.user._id;
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

    const submissions = await Submission.find({ userId, submittedAt: { $gte: oneYearAgo } });
    const activityMap = {};
    submissions.forEach(s => {
      const day = new Date(s.submittedAt).toISOString().split('T')[0];
      activityMap[day] = (activityMap[day] || 0) + 1;
    });
    res.json({ activityMap });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
