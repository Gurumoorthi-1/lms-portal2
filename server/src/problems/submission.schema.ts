import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type SubmissionDocument = Submission & Document;

@Schema({ timestamps: true })
export class Submission {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Problem', required: true })
  problemId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Course', required: true })
  courseId: Types.ObjectId;

  @Prop({ required: true })
  language: string;

  @Prop({ required: true })
  code: string;

  @Prop({ enum: ['Accepted', 'Wrong Answer', 'Runtime Error', 'Time Limit Exceeded', 'Compile Error'], required: true })
  status: string;

  @Prop()
  output: string;

  @Prop()
  error: string;

  @Prop()
  executionTime: number;

  @Prop()
  memoryUsed: number;

  @Prop({ default: 0 })
  testCasesPassed: number;

  @Prop({ default: 0 })
  totalTestCases: number;
}

export const SubmissionSchema = SchemaFactory.createForClass(Submission);
