import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { InvitationsController } from './invitations.controller';
import { InvitationsService } from './invitations.service';
import { InvitationsRepository } from './repositories/invitations.repository';
import { ShareableLinksRepository } from './repositories/shareable-links.repository';
import { Invitation, InvitationSchema } from './schemas/invitation.schema';
import {
  ShareableLink,
  ShareableLinkSchema,
} from './schemas/shareable-link.schema';
import { UsersModule } from '../users/users.module';
import { EmailModule } from '../email/email.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Invitation.name, schema: InvitationSchema },
      { name: ShareableLink.name, schema: ShareableLinkSchema },
    ]),
    UsersModule,
    EmailModule,
  ],
  controllers: [InvitationsController],
  providers: [
    InvitationsService,
    InvitationsRepository,
    ShareableLinksRepository,
  ],
  exports: [InvitationsService],
})
export class InvitationsModule {}
