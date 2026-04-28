import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Course, CourseDocument } from './course.schema';
import { Topic, TopicDocument } from './topic.schema';

@Injectable()
export class CoursesService {
  constructor(
    @InjectModel(Course.name) private courseModel: Model<CourseDocument>,
    @InjectModel(Topic.name) private topicModel: Model<TopicDocument>,
  ) {}

  async findAll() {
    return this.courseModel.find().exec();
  }

  async findOne(id: string) {
    return this.courseModel.findById(id).exec();
  }

  async findBySlug(slug: string) {
    return this.courseModel.findOne({ slug }).exec();
  }

  async findTopicsByCourse(courseId: string) {
    return this.topicModel.find({ courseId: new Types.ObjectId(courseId) }).sort({ order: 1 }).exec();
  }

  // Admin methods
  async createCourse(data: Partial<Course>) {
    return this.courseModel.create(data);
  }

  async createTopic(data: Partial<Topic>) {
    return this.topicModel.create(data);
  }
}
