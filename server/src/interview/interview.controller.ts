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
    const progress = await this.progressService.getUserProgress(req.user.userId);
    const questions = await this.interviewService.generateQuestions(progress.context || {});
    return { success: true, questions };
  }

  @Post('evaluate')
  @UseGuards(JwtAuthGuard, ProgressGuard)
  @RequireStage(AssessmentStage.HR_INTERVIEW)
  async respondToQuestion(@Request() req: any, @Body() body: { question: string, answer: string, evaluationCriteria?: string }) {
    if (!body.question || !body.answer) {
      throw new BadRequestException('Question and answer are required');
    }
    
    const progress = await this.progressService.getUserProgress(req.user.userId);
    const analysis = await this.interviewService.analyzeResponse(body.question, body.answer, progress.context || {});
    
    // Save interview response with per-question score (0-2 marks)
    const questionScore = Math.min(2, Math.max(0, Number(analysis.score) || 0));
    
    // Get existing responses count for sequential numbering
    const existingContext = progress.context?.interview?.responses || {};
    const questionNum = Object.keys(existingContext).length + 1;
    
    await this.progressService.updateContext(req.user.userId, `interview.responses.q${questionNum}`, {
      question: body.question,
      answer: body.answer,
      score: questionScore,
      maxScore: 2,
      analysis: analysis.technicalConsistency + ' | ' + analysis.communication
    });

    return { success: true, ...analysis, score: questionScore };
  }

  @Post('finish')
  @UseGuards(JwtAuthGuard, ProgressGuard)
  @RequireStage(AssessmentStage.HR_INTERVIEW)
  async finishInterview(@Request() req: any) {
    // Calculate total HR score from all individual question responses
    const progress = await this.progressService.getUserProgress(req.user.userId);
    const responses = progress.context?.interview?.responses || {};
    const responseEntries = Object.values(responses) as any[];
    
    const totalScore = responseEntries.reduce((sum: number, r: any) => sum + (Number(r.score) || 0), 0);
    const maxPossible = responseEntries.length * 2; // 2 marks per question
    const percentScore = maxPossible > 0 ? Math.round((totalScore / maxPossible) * 100) : 0;
    
    // Save final aggregated interview data
    await this.progressService.updateContext(req.user.userId, 'interview.totalScore', totalScore);
    await this.progressService.updateContext(req.user.userId, 'interview.maxScore', maxPossible);
    await this.progressService.updateContext(req.user.userId, 'interview.percentScore', percentScore);
    await this.progressService.updateContext(req.user.userId, 'interview.questionsAnswered', responseEntries.length);
    await this.progressService.updateContext(req.user.userId, 'interview.status', 'completed');
    
    // Final Stage Transition: FINISHED
    const stageResult = await this.progressService.moveToNextStage(req.user.userId, AssessmentStage.HR_INTERVIEW);
    return {
      success: true,
      message: 'Assessment completed successfully!',
      totalScore,
      maxScore: maxPossible,
      percentScore,
      newToken: stageResult.newToken
    };
  }
}
