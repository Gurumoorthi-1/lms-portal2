import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true })
export class Progress extends Document {
  @Prop({ type: Types.ObjectId, required: true, ref: 'User' })
  user: Types.ObjectId;

  @Prop({ default: 0 })
  points: number;

  @Prop({ default: 0 })
  freeRunCount: number;

  @Prop([{
    challengeId: { type: Number, required: true },
    solvedAt: { type: Date, default: Date.now },
  }])
  solvedChallenges: { challengeId: number; solvedAt: Date }[];

  @Prop([{
    problemId: { type: Types.ObjectId, ref: 'Problem', required: true },
    solvedAt: { type: Date, default: Date.now },
  }])
  solvedProblems: { problemId: Types.ObjectId; solvedAt: Date }[];

  @Prop({ default: Date.now })
  lastActivity: Date;
}

export const ProgressSchema = SchemaFactory.createForClass(Progress);
