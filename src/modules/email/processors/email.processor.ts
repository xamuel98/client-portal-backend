import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Inject, Logger } from '@nestjs/common';
import { EmailProvider } from '../interfaces/email-provider.interface';

export interface EmailJobData {
  to: string;
  subject: string;
  html: string;
}

@Processor('email')
export class EmailProcessor extends WorkerHost {
  private readonly logger = new Logger(EmailProcessor.name);

  constructor(
    @Inject('EMAIL_PROVIDER') private readonly emailProvider: EmailProvider,
  ) {
    super();
  }

  async process(job: Job<EmailJobData>): Promise<any> {
    const { to, subject, html } = job.data;

    this.logger.log(`Sending email to ${to} with subject: ${subject}`);

    try {
      await this.emailProvider.sendEmail(to, subject, html);
      this.logger.log(`Email sent successfully to ${to}`);
    } catch (error) {
      this.logger.error(`Failed to send email to ${to}: ${error.message}`);
      throw error;
    }
  }
}
