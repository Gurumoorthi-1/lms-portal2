import { Controller, Post, Body, BadRequestException, UseGuards, Request } from '@nestjs/common';
import { InterviewService } from './interview.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ProgressGuard, RequireStage } from '../progress/progress.guard';
import { AssessmentStage } from '../progress/progress.schema';
import { ProgressService } from '../progress/progress.service';

@Controller('interview')
export class InterviewController {
  constructor(
    private readonly interviewService: InterviewService,
    private readonly progressService: ProgressService,
  ) {}

  @Post('generate')
  @UseGuards(JwtAuthGuard, ProgressGuard)
  @RequireStage(AssessmentStage.HR_INTERVIEW)
  async generateQuestions(@Request() req: any): Promise<any> {
    const context = await this.progressService.getContext(req.user.userId);
    const questions = await this.interviewService.generateQuestions(context);
    return { success: true, questions };
  }

  @Post('evaluate')
  @UseGuards(JwtAuthGuard, ProgressGuard)
  @RequireStage(AssessmentStage.HR_INTERVIEW)
  async respondToQuestion(@Request() req: any, @Body() body: { question: string, answer: string, evaluationCriteria?: string }) {
    if (!body.question || !body.answer) {
      throw new BadRequestException('Question and answer are required');
    }
    
    const analysis = await this.interviewService.analyzeResponse(body.question, body.answer);
    
    // Save partial interview response to context
    await this.progressService.updateContext(req.user.userId, `interview.responses.${Date.now()}`, {
      question: body.question,
      answer: body.answer,
      score: analysis.score,
      analysis: analysis.analysis
    });

    return { success: true, ...analysis };
  }

  @Post('finish')
  @UseGuards(JwtAuthGuard, ProgressGuard)
  @RequireStage(AssessmentStage.HR_INTERVIEW)
  async finishInterview(@Request() req: any) {
    // Generate final report (placeholder for now)
    await this.progressService.updateContext(req.user.userId, 'interview.status', 'completed');
    
    // Final Stage Transition: FINISHED
    const stageResult = await this.progressService.moveToNextStage(req.user.userId);
    return {
      success: true,
      message: 'Assessment completed successfully!',
      newToken: stageResult.newToken
    };
  }
}
