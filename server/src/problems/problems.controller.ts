import { Controller, Get, Post, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { ProblemsService } from './problems.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('problems')
export class ProblemsController {
  constructor(private readonly problemsService: ProblemsService) {}

  @Get()
  async findAll(@Query('topicId') topicId?: string) {
    if (topicId) {
      return this.problemsService.findByTopic(topicId);
    }
    return this.problemsService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.problemsService.findOne(id);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/submit')
  async submit(@Param('id') id: string, @Body() body: any, @Request() req) {
    console.log('🚀 Problem Submission Request:', { id, userId: req.user.userId, body });
    const { code, language } = body;
    return this.problemsService.submitSolution(req.user.userId, id, code, language);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id/submissions')
  async getSubmissions(@Param('id') id: string, @Request() req) {
    return this.problemsService.findSubmissionsByUser(req.user.userId, id);
  }
}
