import { Controller, Post, Body, BadRequestException, UseGuards, Req } from '@nestjs/common';
import { CompilerService } from './compiler.service';
import { Request } from 'express';

@Controller('compiler')
export class CompilerController {
  constructor(private readonly compilerService: CompilerService) {}

  @Post('run')
  async runCode(
    @Body('language') language: string,
    @Body('code') code: string,
    @Body('input') input?: string,
  ) {
    if (!language || !code?.trim()) {
      throw new BadRequestException('Language and code are required');
    }

    // Call service to run code
    return await this.compilerService.executeCode(language, code, input || '');
  }
}
