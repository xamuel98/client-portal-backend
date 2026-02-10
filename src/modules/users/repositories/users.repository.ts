import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { BaseRepository } from '../../../common/repositories/base.repository';
import { User, UserDocument } from '../schemas/user.schema';

@Injectable()
export class UsersRepository extends BaseRepository<UserDocument> {
  constructor(
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
  ) {
    super(userModel);
  }

  async findByEmail(
    tenantId: string,
    email: string,
  ): Promise<UserDocument | null> {
    return this.findOne({ tenantId, email });
  }

  // Find a user by email across the whole system (less common, usually tenant-scoped)
  // Useful for "find my tenant" flows or system admins
  async findByEmailGlobal(email: string): Promise<UserDocument | null> {
    return this.findOne({ email });
  }
}
