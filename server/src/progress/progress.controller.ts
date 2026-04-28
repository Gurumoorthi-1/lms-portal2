import { Controller, Get, Post, Body, Req, UseGuards, Request } from '@nestjs/common';
import { ProgressService } from './progress.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('progress')
export class ProgressController {
  constructor(private readonly progressService: ProgressService) {}

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getMyProgress(@Request() req: any) {
    return this.progressService.getUserProgress(req.user.userId);
  }

  @Get('leaderboard')
  getLeaderboard() {
    return this.progressService.getLeaderboard(10);
  }

  @UseGuards(JwtAuthGuard)
  @Post('submit')
  async submitCode(
    @Request() req: any,
    @Body('challengeId') challengeId: number,
    @Body('code') code: string,
    @Body('language') language: string,
  ) {
    return this.progressService.submitChallenge(req.user.userId, challengeId, code, language);
  }
}
