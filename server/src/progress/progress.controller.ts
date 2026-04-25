import { Controller, Get, Post, Body, Req, UseGuards, UnauthorizedException } from '@nestjs/common';
import { ProgressService } from './progress.service';
import { Request } from 'express';
// import { JwtAuthGuard } from '../auth/jwt-auth.guard'; // Use appropriate Auth Guard

@Controller('progress')
export class ProgressController {
  constructor(private readonly progressService: ProgressService) {}

  // MOCK GUARD logic for demonstration: extract `user` from token or assume `req.user.id` is available
  @Get('me')
  async getMyProgress(@Req() req: Request) {
    // Replace with real Auth decoding logic
    const userId = (req as any).user?.id || '60d0fe4f5311236168a109ca'; 
    return this.progressService.getUserProgress(userId);
  }

  @Get('leaderboard')
  getLeaderboard() {
    return this.progressService.getLeaderboard(10);
  }

  @Post('submit')
  async submitCode(
    @Req() req: Request,
    @Body('challengeId') challengeId: number,
    @Body('code') code: string,
    @Body('language') language: string,
  ) {
    const userId = (req as any).user?.id || '60d0fe4f5311236168a109ca'; 
    return this.progressService.submitChallenge(userId, challengeId, code, language);
  }
}
