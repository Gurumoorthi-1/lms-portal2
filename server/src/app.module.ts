import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { CacheModule } from '@nestjs/cache-manager';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { AiModule } from './ai/ai.module';
import { ExamsModule } from './exams/exams.module';

import { CompilerModule } from './compiler/compiler.module';
import { ChallengesModule } from './challenges/challenges.module';
import { ProgressModule } from './progress/progress.module';

@Module({
  imports: [
    // Load .env
    ConfigModule.forRoot({ isGlobal: true }),

    // Setup MongoDB
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        uri: configService.get<string>('MONGO_URI') || 'mongodb://localhost:27017/exam-portal',
        serverSelectionTimeoutMS: 10000,
        socketTimeoutMS: 45000,
        family: 4, 
        serverApi: {
          version: '1',
          strict: true,
          deprecationErrors: true,
        },
      }),
      inject: [ConfigService],
    }),

    // Setup Standard Memory Cache (Disabled Redis to prevent crashes)
    CacheModule.register({
      isGlobal: true,
      ttl: 600, // 10 mins default
      max: 100, // max items in memory
    }),

    // Custom Modules
    AuthModule,
    AiModule,
    ExamsModule,
    CompilerModule,
    ChallengesModule,
    ProgressModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
