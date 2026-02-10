import { Injectable } from '@nestjs/common';
import { MessagesRepository } from './repositories/messages.repository';
import { CreateMessageDto } from './dto/message.dto';
import { Message } from './schemas/message.schema';
import { Types } from 'mongoose';

@Injectable()
export class MessagesService {
  constructor(private readonly messagesRepository: MessagesRepository) {}

  async create(
    createMessageDto: CreateMessageDto,
    tenantId: string,
    senderId: string,
  ): Promise<Message> {
    let threadId: Types.ObjectId | undefined;
    let parentId: Types.ObjectId | undefined;

    if (createMessageDto.parentId) {
      parentId = new Types.ObjectId(createMessageDto.parentId);
      const parentMessage = await this.messagesRepository.findOne({
        _id: createMessageDto.parentId,
        tenantId,
      } as any);

      if (!parentMessage) {
        throw new Error('Parent message not found');
      }

      // Inherit threadId or set to parentId if it's the first reply
      threadId = parentMessage.threadId || parentMessage._id;

      // Increment reply count on the parent message atomically
      await this.messagesRepository.incrementReplyCount(
        createMessageDto.parentId,
      );
    }

    const message = await this.messagesRepository.create({
      ...createMessageDto,
      tenantId: new Types.ObjectId(tenantId),
      senderId: new Types.ObjectId(senderId),
      projectId: createMessageDto.projectId
        ? new Types.ObjectId(createMessageDto.projectId)
        : undefined,
      taskId: createMessageDto.taskId
        ? new Types.ObjectId(createMessageDto.taskId)
        : undefined,
      parentId,
      threadId,
      readBy: [new Types.ObjectId(senderId)], // Sender has read it
    } as any);
    return message;
  }

  async findByContext(
    tenantId: string,
    projectId?: string,
    taskId?: string,
  ): Promise<Message[]> {
    const filter: any = {
      parentId: { $exists: false }, // Only fetch root messages
    };

    if (projectId) filter.projectId = new Types.ObjectId(projectId);
    else if (taskId) filter.taskId = new Types.ObjectId(taskId);
    else return []; // Must provide context

    return this.messagesRepository.findByTenant(tenantId, filter);
  }

  async getThread(messageId: string, tenantId: string): Promise<Message[]> {
    const rootMessage = await this.messagesRepository.findOne({
      _id: messageId,
      tenantId,
    } as any);

    if (!rootMessage) {
      throw new Error('Message not found');
    }

    // Determine the thread ID: if the message has a threadId, it's a child; otherwise, it's the root
    const threadId = rootMessage.threadId || rootMessage._id;

    // Fetch the root message and all replies in the thread
    const messages = await this.messagesRepository.find({
      $or: [{ _id: threadId }, { threadId: threadId }],
      tenantId: new Types.ObjectId(tenantId),
    } as any);

    return messages.sort(
      (a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
    );
  }
}
