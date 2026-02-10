import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { EmailProvider } from '../interfaces/email-provider.interface';

@Injectable()
export class GmailProvider implements EmailProvider {
  private readonly logger = new Logger(GmailProvider.name);
  private transporter: nodemailer.Transporter;

  constructor(private readonly configService: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true, // Use SSL
      family: 4, // Force IPv4
      auth: {
        user: this.configService.get<string>('email.gmail.user'),
        pass: this.configService.get<string>('email.gmail.password'),
      },
    } as any);
  }

  async sendEmail(to: string, subject: string, html: string): Promise<void> {
    try {
      const from = this.configService.get<string>('email.from');
      const info = await this.transporter.sendMail({
        from: `"${from}" <${this.configService.get<string>('email.gmail.user')}>`, // Gmail overrides from usually, but good practice
        to,
        subject,
        html,
      });
      this.logger.log(
        `Email sent to ${to} via Gmail. MessageId: ${info.messageId} Response: ${info.response}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to send email via Gmail: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
}
