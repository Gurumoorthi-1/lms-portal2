import { Module, forwardRef } from '@nestjs/common';
import { ChallengesService } from './challenges.service';
import { ChallengesController } from './challenges.controller';
import { AiModule } from '../ai/ai.module';
import { ProgressModule } from '../progress/progress.module';
import { CompilerModule } from '../compiler/compiler.module';

@Module({
  imports: [AiModule, forwardRef(() => ProgressModule), CompilerModule],
  controllers: [ChallengesController],
  providers: [ChallengesService],
  exports: [ChallengesService],
})
export class ChallengesModule {}
