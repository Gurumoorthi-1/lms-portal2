import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ProgressController } from './progress.controller';
import { ProgressService } from './progress.service';
import { Progress, ProgressSchema } from './progress.schema';
import { CompilerModule } from '../compiler/compiler.module';
import { ChallengesModule } from '../challenges/challenges.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Progress.name, schema: ProgressSchema }]),
    CompilerModule,
    ChallengesModule,
  ],
  controllers: [ProgressController],
  providers: [ProgressService],
  exports: [ProgressService],
})
export class ProgressModule {}
