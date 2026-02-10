import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { BaseRepository } from '../../../common/repositories/base.repository';
import { Invitation, InvitationDocument } from '../schemas/invitation.schema';
import { InvitationStatus } from '../../../common/constants/invitation-status.constant';

@Injectable()
export class InvitationsRepository extends BaseRepository<InvitationDocument> {
  constructor(
    @InjectModel(Invitation.name)
    private invitationModel: Model<InvitationDocument>,
  ) {
    super(invitationModel);
  }

  async findByToken(token: string): Promise<InvitationDocument | null> {
    return this.invitationModel.findOne({ token }).exec();
  }

  async findPendingByEmail(
    email: string,
    tenantId: string,
  ): Promise<InvitationDocument | null> {
    return this.invitationModel
      .findOne({
        email: email.toLowerCase(),
        tenantId: new Types.ObjectId(tenantId),
        status: InvitationStatus.PENDING,
        expiresAt: { $gt: new Date() },
      })
      .exec();
  }

  async findByTenant(tenantId: string): Promise<InvitationDocument[]> {
    return this.invitationModel
      .find({ tenantId: new Types.ObjectId(tenantId) })
      .populate('invitedBy', 'email profile')
      .sort({ createdAt: -1 })
      .exec();
  }
}
