import { Controller, Post, Get, Patch, Body, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  async register(@Body() body: any) {
    return this.authService.register(body);
  }

  @Post('login')
  async login(@Body() body: any) {
    const user = await this.authService.validateUser(body.email, body.password);
    return this.authService.login(user);
  }

  @Post('institution-login')
  async institutionLogin(@Body() body: any) {
    const { institutionId, email, password } = body;
    const user = await this.authService.validateInstitutionalUser(institutionId, email, password);
    return this.authService.login(user);
  }

  // Get fresh, live user profile from DB (replaces stale localStorage)
  @UseGuards(AuthGuard('jwt'))
  @Get('me')
  async getMe(@Request() req) {
    return this.authService.getProfile(req.user.userId);
  }

  // Update user profile (username, etc.)
  @UseGuards(AuthGuard('jwt'))
  @Patch('profile')
  async updateProfile(@Request() req, @Body() body: any) {
    return this.authService.updateProfile(req.user.userId, body);
  }

  // Change password (validates current password before updating)
  @UseGuards(AuthGuard('jwt'))
  @Patch('change-password')
  async changePassword(@Request() req, @Body() body: any) {
    return this.authService.changePassword(req.user.userId, body.currentPassword, body.newPassword);
  }
}
