import { Controller, Post, UseInterceptors, UploadedFile, BadRequestException, UseGuards, Request } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ResumeService } from './resume.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ProgressGuard, RequireStage } from '../progress/progress.guard';
import { AssessmentStage } from '../progress/progress.schema';
import { ProgressService } from '../progress/progress.service';

@Controller('resume')
export class ResumeController {
  constructor(
    private readonly resumeService: ResumeService,
    private readonly progressService: ProgressService,
  ) {}

  @Post('upload')
  @UseGuards(JwtAuthGuard, ProgressGuard)
  @RequireStage(AssessmentStage.RESUME_UPLOAD)
  @UseInterceptors(FileInterceptor('file'))
  async uploadResume(@UploadedFile() file: Express.Multer.File, @Request() req: any) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    const allowedMimeTypes = [
      'application/pdf', 
      'text/plain', 
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword'
    ];
    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException(`File type ${file.mimetype} is not supported. Only PDF, DOCX, and Text files are allowed.`);
    }

    try {
      const analysis = await this.resumeService.parseAndAnalyze(file.buffer, file.mimetype);
      
      // Save analysis results to user progress context
      await this.progressService.updateContext(req.user.userId, 'resume', analysis);
      
      // Automatically transition to the next stage (Aptitude Test)
      const result = await this.progressService.moveToNextStage(req.user.userId);
      
      return {
        success: true,
        analysis,
        newToken: result.newToken,
        message: 'Resume analyzed and promoted to Aptitude stage'
      };
    } catch (error) {
      throw new BadRequestException(error.message || 'Error analyzing resume');
    }
  }
}
