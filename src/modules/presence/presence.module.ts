import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { PresenceService } from './presence.service';
import { PresenceController } from './presence.controller';
import { PresenceGateway } from './presence/presence.gateway';
import { PresenceScheduler } from './presence.scheduler';
import { User, UserSchema } from '../users/schemas/user.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
    ScheduleModule.forRoot(),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.getOrThrow<string>('jwt.secret'),
        signOptions: {
          expiresIn: configService.getOrThrow<string>('jwt.expiresIn') as any,
        },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [PresenceController],
  providers: [PresenceService, PresenceGateway, PresenceScheduler],
  exports: [PresenceService, PresenceGateway],
})
export class PresenceModule {}
