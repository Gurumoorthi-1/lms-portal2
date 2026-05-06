import { Controller, Get, Post, Body, Param, ParseIntPipe, UseGuards, Request } from '@nestjs/common';
import { ChallengesService } from './challenges.service';
import { AiService } from '../ai/ai.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ProgressGuard, RequireStage } from '../progress/progress.guard';
import { AssessmentStage } from '../progress/progress.schema';
import { ProgressService } from '../progress/progress.service';
import { CompilerService } from '../compiler/compiler.service';

@Controller('challenges')
export class ChallengesController {
  constructor(
    private readonly challengesService: ChallengesService,
    private readonly aiService: AiService,
    private readonly progressService: ProgressService,
    private readonly compilerService: CompilerService,
  ) {}

  @Get()
  findAll() {
    return this.challengesService.findAll();
  }

  @Post('generate-ai')
  @UseGuards(JwtAuthGuard, ProgressGuard)
  @RequireStage(AssessmentStage.CODING)
  async generateAiChallenges(@Request() req: any, @Body() body: { language?: string }) {
    const progress = await this.progressService.getUserProgress(req.user.userId);
    const resumeContext = progress.context?.resume || {};
    
    const ctx = {
      skills: resumeContext.skills?.join(', ') || '',
      technologies: resumeContext.skills?.join(', ') || '',
      experience: resumeContext.experience?.join('. ') || '',
      projects: '',
      resumeText: resumeContext.summary || ''
    };

    const lang = body.language || resumeContext.primaryProgrammingLanguage || 'javascript';
    
    return this.aiService.generateCodingProblems(ctx, lang);
  }

  @Post('evaluate-ai')
  @UseGuards(JwtAuthGuard, ProgressGuard)
  @RequireStage(AssessmentStage.CODING)
  async evaluateAiChallenge(@Request() req: any, @Body() body: { problem: any, language: string, code: string }) {
    const evaluation = await this.aiService.evaluateCodeSubmission(body.problem, body.language, body.code);
    
    // Save FULL evaluation results to user progress context for accurate institutional reporting
    const passedCount = evaluation.passedCount || 0;
    const totalCount = evaluation.totalCount || 1;
    const codingScorePercent = Math.round((passedCount / totalCount) * 100);
    
    await this.progressService.updateContext(req.user.userId, 'coding', {
      problemTitle: body.problem.title || body.problem.id,
      passed: evaluation.passed,
      passedCount: passedCount,
      totalCount: totalCount,
      scorePercent: codingScorePercent,
      timeComplexity: evaluation.timeComplexity || 'N/A',
      spaceComplexity: evaluation.spaceComplexity || 'N/A',
      feedback: evaluation.feedback || 'No feedback available',
      status: evaluation.passed ? 'PASSED' : 'FAILED',
      completedAt: new Date()
    });

    if (evaluation.passed) {
      // Transition to HR_INTERVIEW
      const stageResult = await this.progressService.moveToNextStage(req.user.userId, AssessmentStage.CODING);
      return {
        ...evaluation,
        newToken: stageResult.newToken
      };
    }

    return evaluation;
  }

  @Post('submit-tests')
  @UseGuards(JwtAuthGuard, ProgressGuard)
  @RequireStage(AssessmentStage.CODING)
  async submitTests(@Request() req: any, @Body() body: { problemId: string, language: string, code: string, testCases: any[] }) {
    const results: any[] = [];
    let passedCount = 0;

    for (const tc of body.testCases) {
      const exec = await this.compilerService.executeCode(body.language, body.code, tc.input || '');
      const actual = (exec.output || '').trim();
      const expected = (tc.expectedOutput || '').trim();
      const isPassed = actual === expected;
      
      if (isPassed) passedCount++;
      
      results.push({
        input: tc.input,
        expectedOutput: expected,
        actualOutput: actual,
        passed: isPassed
      });
    }

    const scorePercent = Math.round((passedCount / body.testCases.length) * 100);
    
    // Auto-update progress context
    await this.progressService.updateContext(req.user.userId, 'coding', {
      problemId: body.problemId,
      results,
      passedCount,
      totalCount: body.testCases.length,
      scorePercent,
      passed: scorePercent >= 60
    });

    return {
      success: true,
      results,
      passedCount,
      totalCount: body.testCases.length,
      scorePercent,
      passed: scorePercent >= 60
    };
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.challengesService.findOne(id);
  }
}
