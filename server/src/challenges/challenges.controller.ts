import { Controller, Get, Param, ParseIntPipe } from '@nestjs/common';
import { ChallengesService } from './challenges.service';

@Controller('challenges')
export class ChallengesController {
  constructor(private readonly challengesService: ChallengesService) {}

  @Get()
  getAllChallenges() {
    return this.challengesService.findAll();
  }

  @Get(':id')
  getChallengeById(@Param('id', ParseIntPipe) id: number) {
    return this.challengesService.findOne(id);
  }
}
