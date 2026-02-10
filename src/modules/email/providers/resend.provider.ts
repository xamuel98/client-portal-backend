import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';
import { EmailProvider } from '../interfaces/email-provider.interface';

@Injectable()
export class ResendProvider implements EmailProvider {
  private readonly logger = new Logger(ResendProvider.name);
  private resend: Resend;

  constructor(private readonly configService: ConfigService) {
    this.resend = new Resend(
      this.configService.get<string>('email.resendApiKey'),
    );
  }

  async sendEmail(to: string, subject: string, html: string): Promise<void> {
    try {
      const from =
        this.configService.get<string>('email.from') || 'onboarding@resend.dev';
      await this.resend.emails.send({
        from,
        to,
        subject,
        html,
      });
      this.logger.log(`Email sent to ${to} via Resend`);
    } catch (error) {
      this.logger.error(
        `Failed to send email via Resend: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
}
