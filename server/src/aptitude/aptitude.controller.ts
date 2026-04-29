import { Controller, Post, Body, BadRequestException, UseGuards, Request } from '@nestjs/common';
import { AptitudeService } from './aptitude.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ProgressGuard, RequireStage } from '../progress/progress.guard';
import { AssessmentStage } from '../progress/progress.schema';
import { ProgressService } from '../progress/progress.service';

@Controller('aptitude')
export class AptitudeController {
  constructor(
    private readonly aptitudeService: AptitudeService,
    private readonly progressService: ProgressService,
  ) {}

  @Post('generate')
  @UseGuards(JwtAuthGuard, ProgressGuard)
  @RequireStage(AssessmentStage.APTITUDE)
  async generateQuestions(@Request() req: any, @Body() body: { skills?: string[], totalQuestions?: number }) {
    // Try to get skills from progress context (resume analysis) first
    const progress = await this.progressService.getUserProgress(req.user.userId);
    let skills = body.skills;
    
    if (!skills || skills.length === 0) {
      skills = progress.context?.resume?.skills || [];
    }

    if (!skills || skills.length === 0) {
      throw new BadRequestException('Skills are required to generate the aptitude test.');
    }

    const skillsString = skills.slice(0, 8).join(', ');
    return this.aptitudeService.generateTest(skillsString, body.totalQuestions || 10);
  }

  @Post('submit')
  @UseGuards(JwtAuthGuard, ProgressGuard)
  @RequireStage(AssessmentStage.APTITUDE)
  async submitTest(@Request() req: any, @Body() body: { answers: any[], questions: any[] }) {
    if (!body.answers || !body.questions) {
      throw new BadRequestException('Answers and original questions are required for evaluation.');
    }
    
    const result = this.aptitudeService.evaluateTest(body.answers, body.questions);
    
    // Phase 5: Persist results to the 'Red Thread' context
    await this.progressService.updateContext(req.user.userId, 'aptitude', {
      score: result.score,
      percentage: result.percentage,
      maxScore: result.maxScore,
      passed: result.passed,
      submittedAt: new Date()
    });

    // Promotion logic: If passed, move to next stage (Coding)
    let newToken = null;
    if (result.passed) {
      const promo = await this.progressService.moveToNextStage(req.user.userId);
      newToken = promo.newToken;
    }

    return {
      ...result,
      newToken
    };
  }
}
