import { Controller, Post, Body, UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AiService } from './ai.service';

@Controller('ai')
export class AiController {
  constructor(private aiService: AiService) {}

  @Post('generate')
  @UseInterceptors(FileInterceptor('file'))
  async generate(@Body() body: any, @UploadedFile() file: Express.Multer.File) {
    return this.aiService.generateQuestions(body, file);
  }

  @Post('tutor')
  async tutor(@Body() body: { question: string, type: 'hint' | 'explain' | 'custom', userInput?: string }) {
    return this.aiService.getTutorResponse(body.question, body.type, body.userInput);
  }

  @Post('study-plan')
  async getStudyPlan(@Body() stats: any) {
    return this.aiService.generateStudyPlan(stats);
  }

  @Post('review')
  async reviewCode(@Body() body: { language: string, code: string }) {
    if (!body.language || !body.code) return { review: 'Missing code or language.' };
    const review = await this.aiService.analyzeCode(body.language, body.code);
    return { review };
  }
}
