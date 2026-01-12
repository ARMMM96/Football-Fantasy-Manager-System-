import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { DatabaseService } from '../../../database/database.service';

interface JwtPayload {
  sub: string; // user id
  email: string;
  roleId: string;
  role: string;
  iat?: number;
  exp?: number;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    private databaseService: DatabaseService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET') as string,
    });
  }

  async validate(payload: JwtPayload) {
    const { sub: userId } = payload;

    // Verify user exists and is active
    const user = await this.databaseService.client.user.findUnique({
      where: { id: userId, isActive: true },
      include: { role: true },
    });

    if (!user) {
      throw new UnauthorizedException('User not found or inactive');
    }

    // This will be attached to request.user
    return {
      id: user.id,
      email: user.email,
      roleId: user.roleId,
      role: user.role.code,
      isEmailVerified: user.isEmailVerified,
    };
  }
}
