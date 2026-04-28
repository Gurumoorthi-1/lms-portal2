import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type TopicDocument = Topic & Document;

@Schema({ timestamps: true })
export class Topic {
  @Prop({ required: true })
  title: string;

  @Prop({ type: Types.ObjectId, ref: 'Course', required: true })
  courseId: Types.ObjectId;

  @Prop({ default: 0 })
  order: number;

  @Prop()
  description: string;

  @Prop()
  language: string;

  @Prop({ default: '📚' })
  icon: string;

  @Prop({ default: 0 })
  totalProblems: number;

  @Prop({ enum: ['Easy', 'Medium', 'Hard'], default: 'Easy' })
  difficulty: string;
}

export const TopicSchema = SchemaFactory.createForClass(Topic);
