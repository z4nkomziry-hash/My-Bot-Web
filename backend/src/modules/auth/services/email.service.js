import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { LoggerService } from '../../../common/services/logger.service';

@Injectable()
export class EmailService {
  private transporter: nodemailer.Transporter;
  private readonly from: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly logger: LoggerService,
  ) {
    this.from = configService.get<string>('email.from', 'noreply@krd-prodown.com');

    this.transporter = nodemailer.createTransport({
      host: configService.get<string>('email.host', 'smtp.gmail.com'),
      port: configService.get<number>('email.port', 587),
      secure: false,
      auth: {
        user: configService.get<string>('email.user'),
        pass: configService.get<string>('email.password'),
      },
    });
  }

  async sendVerificationEmail(to: string, token: string) {
    const frontendUrl = this.configService.get<string>('FRONTEND_URL');
    const verifyUrl = `${frontendUrl}/verify-email?token=${token}`;

    await this.sendMail({
      to,
      subject: 'پشتڕاستکردنەوەی ئیمەیڵ | KRD-ProDown',
      html: `
        <div dir="rtl" style="font-family: 'Noto Kufi Arabic', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #0a0a1a; color: #fff; border-radius: 20px;">
          <h2 style="color: #ec4899;">🚀 KRD-ProDown</h2>
          <h3>بەخێربێیت!</h3>
          <p>تکایە کلیک لەسەر دوگمەی خوارەوە بکە بۆ پشتڕاستکردنەوەی ئیمەیڵەکەت:</p>
          <a href="${verifyUrl}" style="display: inline-block; padding: 14px 28px; background: linear-gradient(135deg, #ec4899, #a855f7); color: #fff; text-decoration: none; border-radius: 14px; font-weight: bold; margin: 20px 0;">پشتڕاستکردنەوە</a>
          <p style="color: #94a3b8; font-size: 12px;">ئەم لینکە بۆ ماوەی ١ کاتژمێر کار دەکات</p>
        </div>
      `,
    });
  }

  async sendPasswordResetEmail(to: string, token: string) {
    const frontendUrl = this.configService.get<string>('FRONTEND_URL');
    const resetUrl = `${frontendUrl}/reset-password?token=${token}`;

    await this.sendMail({
      to,
      subject: 'گۆڕینی وشەی نهێنی | KRD-ProDown',
      html: `
        <div dir="rtl" style="font-family: 'Noto Kufi Arabic', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #0a0a1a; color: #fff; border-radius: 20px;">
          <h2 style="color: #ec4899;">🔒 KRD-ProDown</h2>
          <h3>داواکاری گۆڕینی وشەی نهێنی</h3>
          <p>کلیک لەسەر دوگمەی خوارەوە بکە بۆ گۆڕینی وشەی نهێنی:</p>
          <a href="${resetUrl}" style="display: inline-block; padding: 14px 28px; background: linear-gradient(135deg, #ec4899, #a855f7); color: #fff; text-decoration: none; border-radius: 14px; font-weight: bold; margin: 20px 0;">گۆڕینی وشەی نهێنی</a>
          <p style="color: #94a3b8; font-size: 12px;">ئەم لینکە بۆ ماوەی ١ کاتژمێر کار دەکات</p>
        </div>
      `,
    });
  }

  private async sendMail(options: { to: string; subject: string; html: string }) {
    try {
      await this.transporter.sendMail({
        from: this.from,
        ...options,
      });
      this.logger.log(`Email sent to ${options.to}: ${options.subject}`, 'EmailService');
    } catch (error) {
      this.logger.error(`Failed to send email to ${options.to}`, error.stack, 'EmailService');
      // Don't throw - email failure shouldn't block the request
    }
  }
}
