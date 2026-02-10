import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import * as fs from 'fs';
import * as path from 'path';
import * as handlebars from 'handlebars';

@Injectable()
export class EmailService {
  constructor(
    private readonly configService: ConfigService,
    @InjectQueue('email') private readonly emailQueue: Queue,
  ) {}

  private async compileTemplate(
    templateName: string,
    data: any,
  ): Promise<string> {
    const templatePath = path.join(
      process.cwd(),
      'src/modules/email/templates',
      `${templateName}.hbs`,
    );
    const template = fs.readFileSync(templatePath, 'utf8');
    const compiledTemplate = handlebars.compile(template);
    return compiledTemplate(data);
  }

  private async sendEmail(
    to: string,
    subject: string,
    templateName: string,
    data: any,
  ) {
    const html = await this.compileTemplate(templateName, data);

    await this.emailQueue.add('send', {
      to,
      subject,
      html,
    });
  }

  async sendVerificationEmail(email: string, token: string) {
    const frontendUrl = this.configService.get<string>('frontendUrl');
    const verificationUrl = `${frontendUrl}/verify-email?token=${token}`;

    await this.sendEmail(email, 'Verify your email', 'verify-email', {
      verificationUrl,
      token,
      year: new Date().getFullYear(),
    });
  }

  async sendWelcomeEmail(
    email: string,
    firstName: string,
    tenantName: string,
    loginUrl: string,
  ) {
    await this.sendEmail(email, 'Welcome to ClientPortal Pro!', 'welcome', {
      firstName,
      tenantName,
      loginUrl,
      year: new Date().getFullYear(),
    });
  }

  async sendPasswordResetEmail(
    email: string,
    firstName: string,
    token: string,
  ) {
    const frontendUrl = this.configService.get<string>('frontendUrl');
    const resetUrl = `${frontendUrl}/reset-password?token=${token}`;

    await this.sendEmail(email, 'Password Reset Request', 'forgot-password', {
      firstName,
      resetUrl,
    });
  }

  async sendNewLoginAlert(
    email: string,
    firstName: string,
    userAgent: string,
    time: string,
  ) {
    await this.sendEmail(email, 'New Login Detected', 'new-login', {
      firstName,
      userAgent,
      time,
    });
  }

  async sendResetPasswordSuccess(email: string, firstName: string) {
    await this.sendEmail(
      email,
      'Password Changed Successfully',
      'reset-password-success',
      {
        firstName,
      },
    );
  }

  async sendMemberInvitation(
    email: string,
    inviterName: string,
    tenantName: string,
    inviteUrl: string,
  ) {
    await this.sendEmail(
      email,
      `Join ${tenantName} on ClientPortal Pro`,
      'invitation-member',
      {
        inviterName,
        tenantName,
        inviteUrl,
      },
    );
  }

  async sendClientInvitation(
    email: string,
    inviterName: string,
    tenantName: string,
    inviteUrl: string,
  ) {
    await this.sendEmail(
      email,
      `Invitation to View Projects - ${tenantName}`,
      'invitation-client',
      {
        inviterName,
        tenantName,
        inviteUrl,
      },
    );
  }

  async sendNotificationEmail(
    email: string,
    title: string,
    message: string,
    metadata?: Record<string, any>,
    actionUrl?: string,
    actionText?: string,
  ) {
    const appName =
      this.configService.get<string>('appName') || 'ClientPortal Pro';
    const frontendUrl = this.configService.get<string>('frontendUrl');

    await this.sendEmail(email, title, 'notification', {
      appName,
      frontendUrl,
      title,
      message,
      metadata,
      actionUrl,
      actionText: actionText || 'View Details',
    });
  }
}
