import { Injectable, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../database/prisma.service';
import * as crypto from 'crypto';

@Injectable()
export class TokenService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  async generateTokens(userId: string, email: string, role: string) {
    const payload = { sub: userId, email, role };

    const accessToken = this.jwtService.sign(payload);

    const refreshToken = this.jwtService.sign(
      { sub: userId, type: 'refresh' },
      {
        secret: this.configService.get<string>('jwt.refreshSecret'),
        expiresIn: this.configService.get<string>('jwt.refreshExpiresIn', '7d'),
      },
    );

    return { accessToken, refreshToken };
  }

  async verifyRefreshToken(token: string) {
    try {
      return this.jwtService.verify(token, {
        secret: this.configService.get<string>('jwt.refreshSecret'),
      });
    } catch (error) {
      throw new BadRequestException('Invalid or expired refresh token');
    }
  }

  async generateEmailToken(userId: string, type: 'verify' | 'reset'): Promise<string> {
    const token = crypto.randomBytes(32).toString('hex');

    await this.prisma.emailToken.create({
      data: {
        token,
        type,
        userId,
        expiresAt: new Date(Date.now() + 3600000), // 1 hour
      },
    });

    return token;
  }

  async verifyEmailToken(token: string, type: 'verify' | 'reset'): Promise<string | null> {
    const emailToken = await this.prisma.emailToken.findUnique({
      where: { token },
    });

    if (!emailToken || emailToken.type !== type) {
      return null;
    }

    if (emailToken.expiresAt < new Date()) {
      await this.prisma.emailToken.delete({ where: { id: emailToken.id } });
      return null;
    }

    await this.prisma.emailToken.delete({ where: { id: emailToken.id } });

    return emailToken.userId;
  }
}
