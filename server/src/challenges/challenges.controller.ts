import { Controller, Get, Post, Body, Param, ParseIntPipe } from '@nestjs/common';
import { ChallengesService } from './challenges.service';
import { AiService } from '../ai/ai.service';

@Controller('challenges')
export class ChallengesController {
  constructor(
    private readonly challengesService: ChallengesService,
    private readonly aiService: AiService,
  ) {}

  @Get()
  findAll() {
    return this.challengesService.findAll();
  }

  @Post('generate-ai')
  async generateAiChallenges(@Body() body: { context: any, language: string }) {
    return this.aiService.generateCodingProblems(body.context, body.language);
  }

  @Post('evaluate-ai')
  async evaluateAiChallenge(@Body() body: { problem: any, language: string, code: string }) {
    return this.aiService.evaluateCodeSubmission(body.problem, body.language, body.code);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.challengesService.findOne(id);
  }
}
