import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Progress, AssessmentStage, ProgressStatus } from './progress.schema';
import { CompilerService } from '../compiler/compiler.service';
import { ChallengesService } from '../challenges/challenges.service';
import { AuthService } from '../auth/auth.service';
import { forwardRef, Inject } from '@nestjs/common';
import { AiService } from '../ai/ai.service';

@Injectable()
export class ProgressService {
  constructor(
    @InjectModel(Progress.name) private progressModel: Model<Progress>,
    private compilerService: CompilerService,
    private challengesService: ChallengesService,
    @Inject(forwardRef(() => AuthService))
    private authService: AuthService,
    private aiService: AiService,
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

      // Institutional Feature: Generate report for the stage just finished
      // Map enum to camelCase report key
      const reportKeyMap = {
        'MCQ': 'mcq',
        'RESUME_UPLOAD': 'resume',
        'APTITUDE': 'aptitude',
        'CODING': 'coding',
        'HR_INTERVIEW': 'hrInterview'
      };
      
      const finishedStageKey = reportKeyMap[progress.currentStage === nextStage ? stages[currentIndex] : progress.currentStage];
      if (finishedStageKey) {
        this.generateInstitutionalReport(userId, finishedStageKey).catch(e => console.error('BG Report Gen Error:', e));
      }

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

      // Institutional Feature: Generate report for MCQ
      this.generateInstitutionalReport(userId, 'mcq').catch(e => console.error('BG Report Gen Error:', e));

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

  async resetProgress(userId: string) {
    // Reset the user's progress completely back to MCQ stage to allow multiple retakes.
    const progress = await this.progressModel.findOneAndUpdate(
      { user: new Types.ObjectId(userId) },
      { 
        $set: { 
          currentStage: AssessmentStage.MCQ, 
          status: ProgressStatus.ACTIVE,
          context: {}, // Clear previous run context to allow fresh evaluation
          reports: {} // FULL RESET: Clear institutional reports
        } 
      },
      { new: true }
    ).populate('user');

    if (!progress) {
      throw new NotFoundException('Progress not found');
    }

    const newToken = await this.authService.generateTokenFromUser(userId, AssessmentStage.MCQ);
    return { success: true, newToken, stage: AssessmentStage.MCQ };
  }

  async generateInstitutionalReport(userId: string, stage: string) {
    const user = await this.authService.getProfile(userId);
    if (!user.institutionId) return null; // Only for institutional users

    const progress = await this.getUserProgress(userId);
    const context = progress.context || {};

    try {
      const dataToAnalyze = context[stage === 'hrInterview' ? 'interview' : stage] || {};
      
      // Extract the REAL score from context data — never let AI hallucinate it
      let realScore: number | null = null;
      let realStatus: string = 'PENDING';
      
      if (stage === 'coding') {
        const codingData = context['coding'] || {};
        realScore = codingData.scorePercent ?? (codingData.passed ? 100 : 0);
        realStatus = codingData.passed ? 'PASSED' : 'FAILED';
      } else if (stage === 'mcq') {
        realScore = context['mcq']?.score ?? null;
        realStatus = context['mcq']?.status || (realScore !== null && realScore >= 50 ? 'PASSED' : 'FAILED');
      } else if (stage === 'aptitude') {
        realScore = context['aptitude']?.score ?? null;
        realStatus = context['aptitude']?.status || (realScore !== null && realScore >= 50 ? 'PASSED' : 'FAILED');
      } else if (stage === 'hrInterview') {
        const interviewData = context['interview'] || {};
        // Use percentScore (0-100) for consistent reporting; fall back to calculating from totalScore/maxScore
        if (interviewData.percentScore != null) {
          realScore = interviewData.percentScore;
        } else if (interviewData.totalScore != null && interviewData.maxScore) {
          realScore = Math.round((interviewData.totalScore / interviewData.maxScore) * 100);
        } else {
          realScore = 0;
        }
        realStatus = interviewData.status === 'completed' ? 'COMPLETED' : 'PENDING';
      }
      
      // Accessing OpenAI via aiService
      const report = await (this.aiService as any).openai.chat.completions.create({
        model: 'openai/gpt-4o-mini',
        messages: [{ 
          role: 'user', 
          content: `Act as an AI Academic Counselor. Generate a professional performance report for a student who just finished the ${stage} round.
          
          Student Data: ${JSON.stringify(dataToAnalyze)}
          Actual Score: ${realScore !== null ? realScore + '%' : 'Not available'}
          Actual Status: ${realStatus}
          
          CRITICAL RULES:
          1. The "score" field in your response MUST be exactly ${realScore !== null ? realScore : 0}. Do NOT make up a different score.
          2. The "status" field MUST be exactly "${realStatus}".
          3. Base your performance summary, strengths, and weaknesses on the actual Student Data provided.
          
          Return ONLY valid JSON:
          {
            "performance": "Summary based on the actual data above",
            "strengths": ["list of 3 strengths based on data"],
            "weaknesses": ["list of 2 weaknesses based on data"],
            "improvementTips": ["actionable tips to improve"],
            "score": ${realScore !== null ? realScore : 0},
            "status": "${realStatus}",
            "generatedAt": "${new Date().toISOString()}"
          }` 
        }],
        response_format: { type: 'json_object' }
      });

      const parsedReport = JSON.parse(report.choices[0].message.content);
      
      // Force the real score/status in case AI still hallucinated
      if (realScore !== null) parsedReport.score = realScore;
      parsedReport.status = realStatus;
      
      await this.progressModel.findOneAndUpdate(
        { user: new Types.ObjectId(userId) },
        { $set: { [`reports.${stage}`]: parsedReport } }
      );

      return parsedReport;
    } catch (e) {
      console.error('Failed to generate institutional report:', e);
      return null;
    }
  }

  async getReports(userId: string) {
    const progress = await this.getUserProgress(userId);
    return progress.reports || {};
  }
}
