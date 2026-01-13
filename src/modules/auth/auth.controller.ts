import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  Ip,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ConnectDto } from './dto/connect.dto';
import { JwtAuthGuard } from '../../core/auth/auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * POST /auth/connect
   * Single-flow: Login if user exists, Register if new
   * (Primary endpoint as per requirements)
   */
  @Post('connect')
  @HttpCode(HttpStatus.OK)
  async connect(@Body() connectDto: ConnectDto, @Ip() ipAddress: string) {
    return this.authService.connect(connectDto, ipAddress);
  }

  /**
   * POST /auth/register
   * Register a new user (legacy, kept for compatibility)
   */
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() registerDto: RegisterDto, @Ip() ipAddress: string) {
    return this.authService.registerUser(registerDto, ipAddress);
  }

  /**
   * POST /auth/login
   * Login existing user (legacy, kept for compatibility)
   */
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() loginDto: LoginDto, @Ip() ipAddress: string) {
    return this.authService.loginUser(loginDto, ipAddress);
  }

  /**
   * GET /auth/profile
   * Get current user profile (protected route)
   */
  @Get('profile')
  @UseGuards(JwtAuthGuard)
  async getProfile(@Request() req: any) {
    return this.authService.getProfile(req.user.id);
  }

  /**
   * POST /auth/logout
   * Logout current user (protected route)
   */
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  async logout(@Request() req: any) {
    await this.authService.logout(req.user.id);
    return { message: 'Logout successful' };
  }
}
