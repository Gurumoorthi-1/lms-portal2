import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type CourseDocument = Course & Document;

@Schema({ timestamps: true })
export class Course {
  @Prop({ required: true })
  title: string;

  @Prop({ required: true, unique: true })
  slug: string;

  @Prop()
  description: string;

  @Prop()
  icon: string;

  @Prop()
  color: string;

  @Prop({ default: 'javascript' })
  defaultLanguage: string;

  @Prop([String])
  allowedLanguages: string[];

  @Prop({ default: 0 })
  totalTopics: number;

  @Prop({ default: 0 })
  totalProblems: number;

  @Prop({ enum: ['Beginner', 'Intermediate', 'Hard'], default: 'Beginner' })
  level: string;
}

export const CourseSchema = SchemaFactory.createForClass(Course);
