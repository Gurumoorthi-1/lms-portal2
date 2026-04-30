import { Controller, Get, Post, Body, Param, Patch, Delete, Query } from '@nestjs/common';
import { ExamsService } from './exams.service';

@Controller('exams')
export class ExamsController {
  constructor(private readonly examsService: ExamsService) {}

  @Post()
  create(@Body() examData: any) {
    return this.examsService.create(examData);
  }

  @Post('reset')
  async resetUserExams(@Body('userId') userId: string) {
    if (!userId) {
      return { success: false, message: 'User ID is required' };
    }
    return this.examsService.resetUserExams(userId);
  }

  @Get('stats')
  getAnalytics(@Query('userId') userId: string) {
    return this.examsService.getAnalytics(userId);
  }

  @Get('instructor/stats')
  getInstructorStats(@Query('filter') filter: string) {
    return this.examsService.getInstructorStats(filter);
  }

  @Get('instructor/students')
  getInstructorStudents() {
    return this.examsService.getInstructorStudents();
  }

  @Get('instructor/deep-analytics')
  getInstructorDeepAnalytics() {
    return this.examsService.getInstructorDeepAnalytics();
  }

  @Get('debug')
  async debug() {
    return this.examsService.findAll();
  }

  @Get()
  findAll(@Query() query: any) {
    return this.examsService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.examsService.findOne(id);
  }

  @Patch(':id/submit')
  updateResult(
    @Param('id') id: string,
    @Body('score') score: number,
    @Body('userId') userId: string,
    @Body('userAnswers') userAnswers: any,
    @Body('timeSpent') timeSpent: number,
    @Body('status') status: string,
  ) {
    return this.examsService.updateResult(id, score, userId, userAnswers, timeSpent, status);
  }

  @Delete(':id')
  delete(@Param('id') id: string) {
    return this.examsService.delete(id);
  }

  @Post(':id/violation')
  logViolation(@Param('id') id: string, @Body() body: any) {
    return this.examsService.logViolation(id, body);
  }
}
