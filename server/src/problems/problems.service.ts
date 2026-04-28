import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Problem, ProblemDocument } from './problem.schema';
import { Submission, SubmissionDocument } from './submission.schema';
import { CompilerService } from '../compiler/compiler.service';
import { ProgressService } from '../progress/progress.service';

@Injectable()
export class ProblemsService {
  constructor(
    @InjectModel(Problem.name) private problemModel: Model<ProblemDocument>,
    @InjectModel(Submission.name) private submissionModel: Model<SubmissionDocument>,
    private compilerService: CompilerService,
    private progressService: ProgressService,
  ) {}

  async findAll() {
    return this.problemModel.find().select('-testCases').exec();
  }

  async findByTopic(topicId: string) {
    return this.problemModel.find({ topicId: new Types.ObjectId(topicId) }).select('-testCases').sort({ order: 1 }).exec();
  }

  async findOne(id: string) {
    const problem = await this.problemModel.findById(id).exec();
    if (!problem) throw new NotFoundException('Problem not found');
    return problem;
  }

  async submitSolution(userId: string, problemId: string, code: string, language: string) {
    const problem = await this.findOne(problemId);
    
    let testCasesPassed = 0;
    const totalTestCases = problem.testCases.length;
    let finalStatus = 'Accepted';
    let firstError = '';
    let firstOutput = '';
    let totalExecTime = 0;

    for (const testCase of problem.testCases) {
      const result = await this.compilerService.executeCode(language, code, testCase.input);
      totalExecTime += result.execTime;

      const cleanedOutput = result.output.trim().split(/\s+/).filter(Boolean).join(' ');
      const expected = testCase.expectedOutput.trim().split(/\s+/).filter(Boolean).join(' ');

      if (result.success && cleanedOutput === expected) {
        testCasesPassed++;
      } else {
        if (!result.success) {
          finalStatus = result.error.includes('Time limit exceeded') ? 'Time Limit Exceeded' : 'Runtime Error';
          firstError = result.error;
        } else {
          finalStatus = 'Wrong Answer';
          firstOutput = cleanedOutput;
        }
        // For efficiency, we could break here, but for progress we might want to run all.
        // Let's break on first error to match common OJ behavior.
        break;
      }
    }

    const submission = await this.submissionModel.create({
      userId: new Types.ObjectId(userId),
      problemId: problem._id,
      courseId: problem.courseId,
      language,
      code,
      status: finalStatus,
      output: firstOutput,
      error: firstError,
      executionTime: totalExecTime,
      testCasesPassed,
      totalTestCases,
    });

    // Update problem stats
    await this.problemModel.findByIdAndUpdate(problemId, {
      $inc: { submissionCount: 1 },
    });

    // Award points if accepted
    if (finalStatus === 'Accepted') {
      await this.progressService.awardPointsForProblem(userId, problemId, problem.difficulty);
    }

    return submission;
  }

  async createProblem(data: Partial<Problem>) {
    return this.problemModel.create(data);
  }

  async findSubmissionsByUser(userId: string, problemId: string) {
    return this.submissionModel.find({ 
      userId: new Types.ObjectId(userId), 
      problemId: new Types.ObjectId(problemId) 
    }).sort({ createdAt: -1 }).limit(10).exec();
  }
}
