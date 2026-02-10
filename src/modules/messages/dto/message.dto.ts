import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsMongoId,
  IsArray,
} from 'class-validator';

export class CreateMessageDto {
  /**
   * The content of the message
   * @example "Hi, I just finished the initial setup. Please review it."
   */
  @IsNotEmpty()
  @IsString()
  content: string;

  /**
   * Optional project ID if the message is related to a project
   * @example "65b2f1e4c8a2b34d5e6f7a8b"
   */
  @IsOptional()
  @IsMongoId()
  projectId?: string;

  /**
   * Optional task ID if the message is related to a task
   * @example "65b2f1e4c8a2b34d5e6f7a8d"
   */
  @IsOptional()
  @IsMongoId()
  taskId?: string;

  /**
   * List of attachment URLs or IDs
   * @example ["https://res.cloudinary.com/.../image.png"]
   */
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  attachments?: string[];

  /**
   * Optional parent message ID to reply to
   * @example "65b2f1e4c8a2b34d5e6f7a8e"
   */
  @IsOptional()
  @IsMongoId()
  parentId?: string;
}
