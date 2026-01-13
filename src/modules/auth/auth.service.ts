import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { DatabaseService } from '../../database/database.service';
import { TeamsService } from '../teams/teams.service';
import * as bcrypt from 'bcrypt';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ConnectDto } from './dto/connect.dto';
import { AuthResponseDto } from './dto/auth-response.dto';
import { User } from '../../database/generated/prisma/client';

@Injectable()
export class AuthService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly jwtService: JwtService,
    private readonly teamsService: TeamsService,
  ) {}

  /**
   * Unified Auth Flow - Single endpoint for login/register
   * - If user exists: login
   * - If user doesn't exist: register
   */
  async connect(
    dto: ConnectDto,
    ipAddress?: string,
  ): Promise<AuthResponseDto> {
    const { email, password } = dto;

    // Check if user exists
    const existingUser = await this.databaseService.client.user.findUnique({
      where: { email: email.toLowerCase() },
      include: { role: true },
    });

    if (existingUser) {
      // User exists - perform login
      return this.login(existingUser, password, ipAddress);
    } else {
      // User doesn't exist - perform registration
      return this.register(dto as RegisterDto, ipAddress);
    }
  }

  /**
   * Register new user - Public method
   */
  async registerUser(
    dto: RegisterDto,
    ipAddress?: string,
  ): Promise<AuthResponseDto> {
    // Check if user already exists
    const existingUser = await this.databaseService.client.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });

    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    return this.register(dto, ipAddress);
  }

  /**
   * Login user - Public method
   */
  async loginUser(
    dto: LoginDto,
    ipAddress?: string,
  ): Promise<AuthResponseDto> {
    // Check if user exists
    const existingUser = await this.databaseService.client.user.findUnique({
      where: { email: dto.email.toLowerCase() },
      include: { role: true },
    });

    if (!existingUser) {
      throw new NotFoundException('User not found. Please register first.');
    }

    return this.login(existingUser, dto.password, ipAddress);
  }

  /**
   * Register new user
   */
  private async register(
    dto: RegisterDto,
    ipAddress?: string,
  ): Promise<AuthResponseDto> {
    const { email, password } = dto;

    // Get default USER role
    const userRole = await this.databaseService.client.role.findUnique({
      where: { code: 'USER' },
    });

    if (!userRole) {
      throw new Error('Default USER role not found. Please run database seeds.');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user
    const user = await this.databaseService.client.user.create({
      data: {
        email: email.toLowerCase(),
        passwordHash,
        roleId: userRole.id,
        isActive: true,
        isEmailVerified: false,
      },
      include: { role: true },
    });

    // Generate JWT
    const accessToken = await this.generateToken(user);

    // Create session
    await this.createSession(user.id, accessToken, ipAddress);

    // Queue async team creation
    await this.teamsService.queueTeamCreation(user.id);

    return {
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        role: user.role.code,
        isEmailVerified: user.isEmailVerified,
      },
      message: 'Registration successful. Your team is being created.',
    };
  }

  /**
   * Login existing user
   */
  private async login(
    user: User & { role: any },
    password: string,
    ipAddress?: string,
  ): Promise<AuthResponseDto> {
    // Check if user is active
    if (!user.isActive) {
      throw new UnauthorizedException('Your account has been deactivated');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Update last login
    await this.databaseService.client.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    // Generate JWT
    const accessToken = await this.generateToken(user);

    // Create session
    await this.createSession(user.id, accessToken, ipAddress);

    return {
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        role: user.role.code,
        isEmailVerified: user.isEmailVerified,
      },
      message: 'Login successful',
    };
  }

  /**
   * Generate JWT token
   */
  private async generateToken(user: User & { role: any }): Promise<string> {
    const payload = {
      sub: user.id,
      email: user.email,
      roleId: user.roleId,
      role: user.role.code,
    };

    return this.jwtService.sign(payload);
  }

  /**
   * Create session record
   */
  private async createSession(
    userId: string,
    token: string,
    ipAddress?: string,
  ): Promise<void> {
    // Hash token for storage
    const tokenHash = await bcrypt.hash(token, 10);

    // Calculate expiration (7 days from now)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await this.databaseService.client.session.create({
      data: {
        userId,
        tokenHash,
        ipAddress: ipAddress || 'unknown',
        expiresAt,
        isActive: true,
      },
    });
  }

  /**
   * Validate user by ID (used by JWT strategy)
   */
  async validateUserById(userId: string): Promise<User & { role: any }> {
    const user = await this.databaseService.client.user.findUnique({
      where: { id: userId, isActive: true },
      include: { role: true },
    });

    if (!user) {
      throw new UnauthorizedException('User not found or inactive');
    }

    return user;
  }

  /**
   * Get user profile
   */
  async getProfile(userId: string) {
    const user = await this.databaseService.client.user.findUnique({
      where: { id: userId },
      include: {
        role: true,
        team: {
          include: {
            players: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Remove password hash from response
    const { passwordHash, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  /**
   * Logout - deactivate session
   */
  async logout(userId: string): Promise<void> {
    await this.databaseService.client.session.updateMany({
      where: { userId, isActive: true },
      data: { isActive: false },
    });
  }
}