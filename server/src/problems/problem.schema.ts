import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ProblemDocument = Problem & Document;

@Schema()
class TestCase {
  @Prop()
  input: string;

  @Prop({ required: true })
  expectedOutput: string;

  @Prop({ default: false })
  isHidden: boolean;
}

const TestCaseSchema = SchemaFactory.createForClass(TestCase);

@Schema()
class Example {
  @Prop()
  input: string;

  @Prop()
  output: string;

  @Prop()
  explanation: string;
}

const ExampleSchema = SchemaFactory.createForClass(Example);

@Schema({ timestamps: true })
export class Problem {
  @Prop({ required: true })
  title: string;

  @Prop({ type: Types.ObjectId, ref: 'Topic', required: true })
  topicId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Course', required: true })
  courseId: Types.ObjectId;

  @Prop({ required: true })
  description: string;

  @Prop({ enum: ['Easy', 'Medium', 'Hard'], default: 'Easy' })
  difficulty: string;

  @Prop({ required: true })
  language: string;

  @Prop([String])
  allowedLanguages: string[];

  @Prop({ type: Map, of: String })
  starterCode: Map<string, string>;

  @Prop([String])
  hints: string[];

  @Prop({ type: [ExampleSchema] })
  examples: Example[];

  @Prop({ type: [TestCaseSchema] })
  testCases: TestCase[];

  @Prop({ default: 0 })
  submissionCount: number;

  @Prop({ default: 0 })
  successRate: number;

  @Prop({ default: 0 })
  order: number;

  @Prop([String])
  tags: string[];
}

export const ProblemSchema = SchemaFactory.createForClass(Problem);
