import { Injectable, UnauthorizedException, ConflictException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcryptjs';
import { User } from './user.schema';

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(User.name) private userModel: Model<User>,
    private jwtService: JwtService,
  ) {}

  async register(authDto: any) {
    const { username, email, password } = authDto;
    const normalizedEmail = email.toLowerCase();
    const existingUser = await this.userModel.findOne({ email: normalizedEmail });
    if (existingUser) {
      throw new ConflictException('User already exists');
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const role = normalizedEmail.includes('instructor') ? 'instructor' : 'student';
    const user = new this.userModel({ username, email: normalizedEmail, password: hashedPassword, role });
    await user.save();

    return this.login(user); // Automatically login after register
  }

  async login(user: any, currentStage: string = 'MCQ') {
    const payload = { email: user.email, sub: user._id, currentStage };
    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role || (user.email.includes('instructor') ? 'instructor' : 'student'),
        xp: user.xp,
        level: user.level,
        currentStage,
      },
    };
  }

  async generateTokenFromUser(userId: string, currentStage: string) {
    const user = await this.userModel.findById(userId);
    if (!user) throw new UnauthorizedException('User not found during token generation');
    const payload = { email: user.email, sub: user._id, currentStage };
    return this.jwtService.sign(payload);
  }

  async validateUser(email: string, pass: string): Promise<any> {
    const normalizedEmail = email.toLowerCase();
    const user = await this.userModel.findOne({ email: normalizedEmail });
    if (user && (await bcrypt.compare(pass, user.password as string))) {
      return user;
    }
    throw new UnauthorizedException('Invalid credentials');
  }

  async getProfile(userId: string): Promise<any> {
    const user = await this.userModel.findById(userId).lean().exec();
    if (!user) throw new UnauthorizedException('User not found');
    return {
      id: (user as any)._id?.toString(),
      username: (user as any).username,
      email: (user as any).email,
      role: (user as any).role,
      xp: (user as any).xp || 0,
      level: (user as any).level || 1,
      streak: (user as any).streak || 0,
      preferences: (user as any).preferences || {},
    };
  }

  async updateProfile(userId: string, data: any): Promise<any> {
    const allowedFields: any = {};
    if (data.username) allowedFields.username = data.username;
    if (data.preferences) allowedFields.preferences = data.preferences;

    const user = await this.userModel.findByIdAndUpdate(
      userId,
      { $set: allowedFields },
      { new: true, lean: true }
    ).exec();
    if (!user) throw new UnauthorizedException('User not found');
    return {
      id: (user as any)._id?.toString(),
      username: (user as any).username,
      email: (user as any).email,
      role: (user as any).role,
      xp: (user as any).xp || 0,
      level: (user as any).level || 1,
      streak: (user as any).streak || 0,
      preferences: (user as any).preferences || {},
    };
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<any> {
    const user = await this.userModel.findById(userId).exec();
    if (!user) throw new UnauthorizedException('User not found');
    const isMatch = await bcrypt.compare(currentPassword, user.password as string);
    if (!isMatch) throw new BadRequestException('Current password is incorrect');
    const hashed = await bcrypt.hash(newPassword, 10);
    await this.userModel.findByIdAndUpdate(userId, { password: hashed }).exec();
    return { message: 'Password updated successfully' };
  }
}

