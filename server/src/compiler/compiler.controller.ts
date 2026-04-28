import { Controller, Post, Body, BadRequestException, UseGuards, Req } from '@nestjs/common';
import { CompilerService } from './compiler.service';
import { Request } from 'express';
import { Request as ExpressRequest } from 'express';

@Controller('compiler')
export class CompilerController {
  constructor(private readonly compilerService: CompilerService) {}

  @Post('run')
  async runCode(
    @Body() body: any
  ) {
    console.log('🚀 Compiler Run Request:', body);
    const { language, code, input } = body;
    if (!language) {
      throw new BadRequestException('Language is required');
    }
    if (!code || !code.trim()) {
      throw new BadRequestException('Code cannot be empty');
    }

    // Call service to run code
    return await this.compilerService.executeCode(language, code, input || '');
  }
}
