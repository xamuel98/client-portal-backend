import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { BaseRepository } from '../../../common/repositories/base.repository';
import { Message, MessageDocument } from '../schemas/message.schema';

@Injectable()
export class MessagesRepository extends BaseRepository<MessageDocument> {
  constructor(
    @InjectModel(Message.name)
    private readonly messageModel: Model<MessageDocument>,
  ) {
    super(messageModel);
  }

  async incrementReplyCount(id: string): Promise<void> {
    await this.messageModel
      .findByIdAndUpdate(id, { $inc: { replyCount: 1 } })
      .exec();
  }
}
