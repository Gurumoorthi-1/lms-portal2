import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export enum AssessmentStage {
  MCQ = 'MCQ',
  RESUME_UPLOAD = 'RESUME_UPLOAD',
  APTITUDE = 'APTITUDE',
  CODING = 'CODING',
  HR_INTERVIEW = 'HR_INTERVIEW',
  FINISHED = 'FINISHED',
}

export enum ProgressStatus {
  LOCKED = 'LOCKED',
  ACTIVE = 'ACTIVE',
  PASSED = 'PASSED',
}

@Schema({ timestamps: true })
export class Progress extends Document {
  @Prop({ type: Types.ObjectId, required: true, ref: 'User', unique: true })
  user: Types.ObjectId;

  @Prop({ type: String, enum: AssessmentStage, default: AssessmentStage.MCQ })
  currentStage: AssessmentStage;

  @Prop({ type: String, enum: ProgressStatus, default: ProgressStatus.ACTIVE })
  status: ProgressStatus;

  @Prop({ type: Object, default: {} })
  context: any; // Centralized context for HR Agent

  @Prop({ default: 0 })
  points: number;

  @Prop({ default: 0 })
  freeRunCount: number;

  @Prop({ type: [{ challengeId: Number, solvedAt: Date }], default: [] })
  solvedChallenges: any[];

  @Prop({ type: [{ problemId: { type: Types.ObjectId, ref: 'Problem' }, solvedAt: Date }], default: [] })
  solvedProblems: any[];

  @Prop({ default: Date.now })
  lastActivity: Date;

  @Prop({ type: Object, default: {} })
  reports: {
    mcq?: any;
    aptitude?: any;
    coding?: any;
    hrInterview?: any;
    final?: any;
  };
}

export const ProgressSchema = SchemaFactory.createForClass(Progress);
