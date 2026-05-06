import { Controller, Post, UseInterceptors, UploadedFile, UseGuards, Request, Get, Delete, Param, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AuthService } from '../auth/auth.service';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User } from '../auth/user.schema';
import * as bcrypt from 'bcryptjs';
const csv = require('csv-parser');
import { Readable } from 'stream';

@Controller('institution')
export class InstitutionController {
  constructor(
    @InjectModel(User.name) private userModel: Model<User>,
  ) {}

  @Post('upload-csv')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('file'))
  async uploadCsv(@UploadedFile() file: Express.Multer.File, @Request() req: any) {
    const userRole = req.user.role || (req.user.email?.includes('instructor') ? 'instructor' : 'student');
    
    if (userRole !== 'instructor') {
      throw new BadRequestException('Only instructors can upload institutional users. Your role: ' + userRole);
    }

    const results: any[] = [];
    const stream = Readable.from(file.buffer);
    
    return new Promise((resolve, reject) => {
      stream
        .pipe(csv())
        .on('data', (data) => results.push(data))
        .on('end', async () => {
          try {
            if (results.length === 0) {
              return resolve({ success: false, message: 'CSV file is empty or invalid format.' });
            }

            const usersToCreate: any[] = [];
            for (const row of results) {
              // CSV Columns: institutionId, email, password
              const { institutionId, email, password } = row;
              
              if (!institutionId || !email || !password) {
                 continue; // Skip invalid rows
              }
              
              const username = email.split('@')[0];
              const hashedPassword = await bcrypt.hash(password, 10);
              
              usersToCreate.push({
                username,
                email: email.toLowerCase(),
                password: hashedPassword,
                role: 'student',
                institutionId,
                institutionName: req.user.username + ' Institution',
                createdBy: req.user.userId
              });
            }

            if (usersToCreate.length === 0) {
              return resolve({ success: false, message: 'No valid user data found in CSV.' });
            }

            await this.userModel.insertMany(usersToCreate);
            resolve({ success: true, count: usersToCreate.length });
          } catch (err) {
            console.error('Error during CSV bulk insert:', err);
            reject(new Error('Database sync failed: ' + err.message));
          }
        });
    }).catch(err => {
      console.error('CSV Processing Error:', err);
      throw new BadRequestException(err.message);
    });
  }

  @Get('users')
  @UseGuards(JwtAuthGuard)
  async getInstitutionalUsers(@Request() req: any) {
    return this.userModel.find({ createdBy: req.user.userId }).select('-password');
  }

  @Delete('users')
  @UseGuards(JwtAuthGuard)
  async deleteInstitutionalUsers(@Request() req: any) {
    await this.userModel.deleteMany({ createdBy: req.user.userId });
    return { success: true, message: 'All institutional users deleted.' };
  }
}
