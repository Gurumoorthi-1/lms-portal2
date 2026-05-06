import { Controller, Post, Body, BadRequestException, UseGuards, Req } from '@nestjs/common';
import { CompilerService } from './compiler.service';
import { Request } from 'express';
import { Request as ExpressRequest } from 'express';

@Controller('compiler')
export class CompilerController {
  constructor(private readonly compilerService: CompilerService) {}

  @Post('run')
  async runCode(@Body() body: any) {
    const { language, code, input } = body;
    if (!language || !code) throw new BadRequestException('Missing language or code');
    return await this.compilerService.executeCode(language, code, input || '');
  }

  @Post('execute')
  async execute(@Body() body: { language: string, code: string, input_data: string }) {
    if (!body.language || !body.code) throw new BadRequestException('Missing language or code');
    return await this.compilerService.executeCode(body.language, body.code, body.input_data || '');
  }
}
