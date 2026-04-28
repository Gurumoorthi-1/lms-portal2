import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ProblemsService } from './problems.service';
import { ProblemsController } from './problems.controller';
import { Problem, ProblemSchema } from './problem.schema';
import { Submission, SubmissionSchema } from './submission.schema';
import { CompilerModule } from '../compiler/compiler.module';
import { ProgressModule } from '../progress/progress.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Problem.name, schema: ProblemSchema },
      { name: Submission.name, schema: SubmissionSchema },
    ]),
    CompilerModule,
    ProgressModule,
  ],
  controllers: [ProblemsController],
  providers: [ProblemsService],
  exports: [ProblemsService],
})
export class ProblemsModule {}
