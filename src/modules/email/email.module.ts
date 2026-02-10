import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { EmailService } from './email.service';
import { EmailProcessor } from './processors/email.processor';
import { GmailProvider } from './providers/gmail.provider';
import { ResendProvider } from './providers/resend.provider';

@Module({
  imports: [
    ConfigModule,
    BullModule.registerQueue({
      name: 'email',
    }),
  ],
  providers: [
    EmailService,
    EmailProcessor,
    GmailProvider,
    ResendProvider,
    {
      provide: 'EMAIL_PROVIDER',
      useFactory: (
        configService: ConfigService,
        gmail: GmailProvider,
        resend: ResendProvider,
      ) => {
        const driver = configService.get<string>('email.driver');
        return driver === 'gmail' ? gmail : resend;
      },
      inject: [ConfigService, GmailProvider, ResendProvider],
    },
  ],
  exports: [EmailService],
})
export class EmailModule {}
