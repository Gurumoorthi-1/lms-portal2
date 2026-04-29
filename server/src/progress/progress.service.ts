import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Progress, AssessmentStage, ProgressStatus } from './progress.schema';
import { CompilerService } from '../compiler/compiler.service';
import { ChallengesService } from '../challenges/challenges.service';
import { AuthService } from '../auth/auth.service';
import { forwardRef, Inject } from '@nestjs/common';

@Injectable()
export class ProgressService {
  constructor(
    @InjectModel(Progress.name) private progressModel: Model<Progress>,
    private compilerService: CompilerService,
    private challengesService: ChallengesService,
    @Inject(forwardRef(() => AuthService))
    private authService: AuthService,
  ) {}

  async getUserProgress(userId: string) {
    const progress = await this.progressModel.findOneAndUpdate(
      { user: new Types.ObjectId(userId) },
      { $setOnInsert: { currentStage: AssessmentStage.MCQ, status: ProgressStatus.ACTIVE, points: 0 } },
      { new: true, upsert: true }
    );
    return progress;
  }

  async getLeaderboard(limit: number = 10) {
    return this.progressModel
      .find({})
      .sort({ points: -1 })
      .limit(limit)
      .populate('user', 'username email'); // Assume User model has these fields
  }

  async incrementFreeRunCount(userId: string) {
    return this.progressModel.findOneAndUpdate(
      { user: new Types.ObjectId(userId) },
      { $inc: { freeRunCount: 1 }, lastActivity: Date.now() },
      { upsert: true, new: true }
    );
  }

  async submitChallenge(userId: string, challengeId: number, code: string, language: string) {
    const challenge = await this.challengesService.findOne(challengeId);
    if (!challenge) {
      throw new NotFoundException('Challenge not found');
    }

    if (challenge.language !== language) {
      throw new BadRequestException('Language mismatch for this challenge');
    }

    // Run the code compiler with the user's code
    const result = await this.compilerService.executeCode(language, code);

    if (!result.success) {
      return { ...result, success: false, passed: false };
    }

    // Validate the output using the challenge's hidden validation function
    const validateFn = this.challengesService.getValidateFunction(challengeId);
    const passed = validateFn ? validateFn(result.output) : false;

    if (passed) {
      // Points distribution
      let pointsToAward = 10;
      if (challenge.difficulty === 'Medium') pointsToAward = 20;
      else if (challenge.difficulty === 'Hard') pointsToAward = 30;

      // Update progress if not previously solved
      const progress = await this.getUserProgress(userId);
      const alreadySolved = progress.solvedChallenges.some(sc => sc.challengeId === challengeId);

      if (!alreadySolved) {
        await this.progressModel.findOneAndUpdate(
          { user: new Types.ObjectId(userId) },
          {
            $inc: { points: pointsToAward },
            $push: { solvedChallenges: { challengeId, solvedAt: new Date() } },
            lastActivity: Date.now()
          }
        );
      }
    }

    return {
      ...result,
      success: true,
      passed,
      expected: challenge.expectedOutput,
      message: passed ? 'Congratulations! You solved the challenge.' : 'Output did not match expected result.'
    };
  }

  async awardPointsForProblem(userId: string, problemId: string, difficulty: string) {
    let pointsToAward = 10;
    if (difficulty === 'Medium') pointsToAward = 20;
    else if (difficulty === 'Hard') pointsToAward = 30;

    const progress = await this.getUserProgress(userId);
    const alreadySolved = progress.solvedProblems?.some(sp => sp.problemId.toString() === problemId);

    if (!alreadySolved) {
      return this.progressModel.findOneAndUpdate(
        { user: new Types.ObjectId(userId) },
        {
          $inc: { points: pointsToAward },
          $push: { solvedProblems: { problemId: new Types.ObjectId(problemId), solvedAt: new Date() } },
          lastActivity: Date.now()
        },
        { new: true }
      );
    }
    return progress;
  }

  async moveToNextStage(userId: string, fromStage?: AssessmentStage) {
    const progress = await this.getUserProgress(userId);
    const stages = Object.values(AssessmentStage);
    const currentIndex = stages.indexOf(progress.currentStage);

    // If fromStage is provided, only promote if it matches currentStage
    if (fromStage && progress.currentStage !== fromStage) {
      const currentToken = await this.authService.generateTokenFromUser(userId, progress.currentStage);
      return { progress, newToken: currentToken };
    }
    
    if (currentIndex < stages.length - 1) {
      const nextStage = stages[currentIndex + 1] as AssessmentStage;
      progress.currentStage = nextStage;
      progress.lastActivity = new Date();
      await progress.save();

      // Issue a new JWT with updated stage
      const newToken = await this.authService.generateTokenFromUser(userId, nextStage);
      return { progress, newToken };
    }
    return { progress, newToken: null };
  }

  async updateContext(userId: string, key: string, data: any) {
     return this.progressModel.findOneAndUpdate(
       { user: new Types.ObjectId(userId) },
       { $set: { [`context.${key}`]: data }, lastActivity: Date.now() },
       { new: true }
     );
  }

  async getContext(userId: string) {
    const progress = await this.getUserProgress(userId);
    return progress.context || {};
  }

  async getFullCandidateProfile(userId: string) {
    const progress = await this.getUserProgress(userId);
    return {
      context: progress.context || {},
      stage: progress.currentStage,
      points: progress.points,
      lastActivity: progress.lastActivity
    };
  }

  async submitMcq(userId: string, answers: any) {
    // In a production environment, we would validate the answers against a database
    const passed = true; 
    const score = 85; // Simulated score

    if (passed) {
      // Phase 5: Persist MCQ results to the 'Red Thread' context
      await this.updateContext(userId, 'mcq', {
        score,
        totalQuestions: Object.keys(answers).length,
        submittedAt: new Date(),
        status: 'PASSED'
      });

      const result = await this.moveToNextStage(userId, AssessmentStage.MCQ);
      return {
        success: true,
        passed: true,
        nextRound: '/student/resume',
        newToken: result.newToken
      };
    }

    return {
      success: false,
      passed: false,
      message: 'Assessment failed. Please try again.'
    };
  }
}
