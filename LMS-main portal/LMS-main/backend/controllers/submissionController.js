import Submission from '../models/Submission.js';
import Problem from '../models/Problem.js';
import { executeCode, LANGUAGE_IDS } from './codeController.js';

export const submitCode = async (req, res) => {
  try {
    const { problemId, code, language } = req.body;
    const userId = req.user._id;

    const problem = await Problem.findById(problemId);
    if (!problem) return res.status(404).json({ message: 'Problem not found' });

    const languageId = LANGUAGE_IDS[language];
    let status = 'Accepted';
    let testCasesPassed = 0;
    let output = '';
    let error = null;

    if (!languageId) {
      // HTML/CSS - auto accept
      testCasesPassed = problem.testCases.length;
      status = 'Accepted';
      output = 'Preview Accepted';
    } else {
      for (const tc of problem.testCases) {
        try {
          const result = await executeCode(code, languageId, tc.input || '');
          const actualOutput = (result.stdout || '').trim();
          const expected = (tc.expectedOutput || '').trim();

          if (result.status?.id === 6) { status = 'Compile Error'; error = result.compile_output; break; }
          if (result.status?.id === 11) { status = 'Runtime Error'; error = result.stderr; break; }
          if (result.status?.id === 5) { status = 'Time Limit Exceeded'; break; }
          if (actualOutput === expected) testCasesPassed++;
          else { status = 'Wrong Answer'; output = `Expected: ${expected}\nGot: ${actualOutput}`; }
        } catch (e) {
          status = 'Runtime Error'; error = e.message; break;
        }
      }
      if (testCasesPassed === problem.testCases.length) status = 'Accepted';
    }

    const submission = await Submission.create({
      userId, problemId, courseId: problem.courseId, language, code,
      status, output, error, testCasesPassed, totalTestCases: problem.testCases.length
    });

    // Update submission count
    await Problem.findByIdAndUpdate(problemId, { $inc: { submissionCount: 1 } });

    res.json(submission);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const getSubmissions = async (req, res) => {
  try {
    const submissions = await Submission.find({ userId: req.user._id })
      .populate('problemId', 'title difficulty')
      .sort({ submittedAt: -1 })
      .limit(50);
    res.json(submissions);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
