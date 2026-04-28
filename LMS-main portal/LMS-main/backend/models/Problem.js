import mongoose from 'mongoose';

const testCaseSchema = new mongoose.Schema({
  input: { type: String },
  expectedOutput: { type: String, required: true },
  isHidden: { type: Boolean, default: false }
});

const problemSchema = new mongoose.Schema({
  title: { type: String, required: true },
  topicId: { type: mongoose.Schema.Types.ObjectId, ref: 'Topic', required: true },
  courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
  description: { type: String, required: true },
  difficulty: { type: String, enum: ['Easy', 'Medium', 'Hard'], default: 'Easy' },
  language: { type: String, required: true },
  allowedLanguages: [{ type: String }],
  starterCode: { type: Map, of: String },
  hints: [{ type: String }],
  examples: [{
    input: String,
    output: String,
    explanation: String
  }],
  testCases: [testCaseSchema],
  submissionCount: { type: Number, default: 0 },
  successRate: { type: Number, default: 0 },
  order: { type: Number, default: 0 },
  tags: [{ type: String }]
});

export default mongoose.models.Problem || mongoose.model('Problem', problemSchema);
