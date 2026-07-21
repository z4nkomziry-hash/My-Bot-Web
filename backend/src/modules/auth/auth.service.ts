import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../../database/prisma.service';
import { RedisService } from '../../redis/redis.service';
import { TokenService } from './services/token.service';
import { EmailService } from './services/email.service';
import { LoggerService } from '../../common/services/logger.service';
import { AuditService } from '../../common/services/audit.service';
import {
  RegisterDto,
  LoginDto,
  RefreshTokenDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  VerifyEmailDto,
} from './dto/auth.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly tokenService: TokenService,
    private readonly emailService: EmailService,
    private readonly configService: ConfigService,
    private readonly logger: LoggerService,
    private readonly audit: AuditService,
  ) {}

  async register(dto: RegisterDto) {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existingUser) {
      throw new ConflictException('ئەم ئیمەیڵە پێشتر تۆمار کراوە');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 12);

    const user = await this.prisma.user.create({
      data: {
        name: dto.name,
        email: dto.email,
        password: hashedPassword,
        subscription: {
          create: {
            plan: 'free',
            status: 'active',
          },
        },
      },
      include: {
        subscription: true,
      },
    });

    // Send verification email
    const verificationToken = await this.tokenService.generateEmailToken(user.id, 'verify');
    await this.emailService.sendVerificationEmail(user.email, verificationToken);

    const tokens = await this.tokenService.generateTokens(user.id, user.email, user.role);

    await this.audit.log({
      userId: user.id,
      action: 'register',
      resource: 'user',
      resourceId: user.id,
    });

    this.logger.log(`New user registered: ${user.email}`, 'AuthService');

    return {
      user: this.sanitizeUser(user),
      ...tokens,
    };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      include: { subscription: true },
    });

    if (!user || !user.password) {
      throw new UnauthorizedException('ئیمەیڵ یان وشەی نهێنی هەڵەیە');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.password);

    if (!isPasswordValid) {
      await this.audit.log({
        userId: user.id,
        action: 'login_failed',
        resource: 'auth',
      });
      throw new UnauthorizedException('ئیمەیڵ یان وشەی نهێنی هەڵەیە');
    }

    const tokens = await this.tokenService.generateTokens(user.id, user.email, user.role);

    // Store refresh token
    await this.prisma.user.update({
      where: { id: user.id },
      data: { refreshToken: tokens.refreshToken },
    });

    await this.audit.log({
      userId: user.id,
      action: 'login',
      resource: 'auth',
    });

    this.logger.log(`User logged in: ${user.email}`, 'AuthService');

    return {
      user: this.sanitizeUser(user),
      ...tokens,
    };
  }

  async googleLogin(googleUser: any) {
    let user = await this.prisma.user.findFirst({
      where: {
        OR: [
          { email: googleUser.email },
          { oauthProvider: 'google', oauthId: googleUser.googleId },
        ],
      },
      include: { subscription: true },
    });

    if (!user) {
      user = await this.prisma.user.create({
        data: {
          name: googleUser.name,
          email: googleUser.email,
          avatar: googleUser.picture,
          oauthProvider: 'google',
          oauthId: googleUser.googleId,
          emailVerified: true,
          subscription: {
            create: {
              plan: 'free',
              status: 'active',
            },
          },
        },
        include: { subscription: true },
      });

      this.logger.log(`New Google user: ${user.email}`, 'AuthService');
    }

    const tokens = await this.tokenService.generateTokens(user.id, user.email, user.role);

    await this.prisma.user.update({
      where: { id: user.id },
      data: { refreshToken: tokens.refreshToken },
    });

    await this.audit.log({
      userId: user.id,
      action: 'google_login',
      resource: 'auth',
    });

    return {
      user: this.sanitizeUser(user),
      ...tokens,
    };
  }

  async refreshToken(dto: RefreshTokenDto) {
    const payload = await this.tokenService.verifyRefreshToken(dto.refreshToken);

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      include: { subscription: true },
    });

    if (!user || user.refreshToken !== dto.refreshToken) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const tokens = await this.tokenService.generateTokens(user.id, user.email, user.role);

    await this.prisma.user.update({
      where: { id: user.id },
      data: { refreshToken: tokens.refreshToken },
    });

    return tokens;
  }

  async logout(userId: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { refreshToken: null },
    });

    await this.audit.log({
      userId,
      action: 'logout',
      resource: 'auth',
    });
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user) {
      // Don't reveal if user exists
      return { message: 'ئەگەر ئیمەیڵەکەت تۆمار کرابێت، ڕێنمایی بۆت نێردرا' };
    }

    const resetToken = await this.tokenService.generateEmailToken(user.id, 'reset');
    await this.emailService.sendPasswordResetEmail(user.email, resetToken);

    return { message: 'ڕێنمایی گۆڕینی وشەی نهێنی نێردرا' };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const userId = await this.tokenService.verifyEmailToken(dto.token, 'reset');

    if (!userId) {
      throw new BadRequestException('کۆدی نادروست یان بەسەرچوو');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 12);

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        password: hashedPassword,
        refreshToken: null,
      },
    });

    await this.audit.log({
      userId,
      action: 'password_reset',
      resource: 'auth',
    });

    return { message: 'وشەی نهێنی بە سەرکەوتوویی گۆڕدرا' };
  }

  async verifyEmail(dto: VerifyEmailDto) {
    const userId = await this.tokenService.verifyEmailToken(dto.token, 'verify');

    if (!userId) {
      throw new BadRequestException('کۆدی نادروست یان بەسەرچوو');
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { emailVerified: true },
    });

    return { message: 'ئیمەیڵەکەت بە سەرکەوتوویی پشتڕاست کرا' };
  }

  private sanitizeUser(user: any) {
    const { password, refreshToken, oauthId, ...sanitized } = user;
    return sanitized;
  }
}
