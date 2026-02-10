import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  v2 as cloudinary,
  UploadApiResponse,
  UploadApiErrorResponse,
} from 'cloudinary';
import * as streamifier from 'streamifier';
import * as path from 'path';
import { File, FileDocument } from './schemas/file.schema';

@Injectable()
export class FilesService {
  constructor(
    @InjectModel(File.name) private readonly fileModel: Model<FileDocument>,
  ) {}

  async uploadFile(
    file: Express.Multer.File,
    tenantId: string,
    userId: string,
    relatedEntity: string = 'general',
    relatedEntityId?: string,
  ): Promise<File> {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    const uploadResult = await this.uploadToCloudinary(file, tenantId);

    const newFile = new this.fileModel({
      tenantId: new Types.ObjectId(tenantId),
      name: file.originalname,
      publicId: uploadResult.public_id,
      url: uploadResult.secure_url,
      mimeType: file.mimetype,
      size: file.size,
      uploadedBy: new Types.ObjectId(userId),
      relatedEntity,
      relatedEntityId: relatedEntityId
        ? new Types.ObjectId(relatedEntityId)
        : undefined,
    });

    return newFile.save();
  }

  async uploadBuffer(
    buffer: Buffer,
    fileName: string,
    mimeType: string,
    tenantId: string,
    userId?: string,
    relatedEntity: string = 'general',
    relatedEntityId?: string,
  ): Promise<File> {
    const uploadResult = await new Promise<
      UploadApiResponse | UploadApiErrorResponse
    >((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: `client-portal/${tenantId}`,
          public_id: path.parse(fileName).name,
        },
        (error, result) => {
          if (error) return reject(error);
          resolve(result as UploadApiResponse);
        },
      );
      streamifier.createReadStream(buffer).pipe(uploadStream);
    });

    const newFile = new this.fileModel({
      tenantId: new Types.ObjectId(tenantId),
      name: fileName,
      publicId: uploadResult.public_id,
      url: uploadResult.secure_url,
      mimeType,
      size: buffer.length,
      uploadedBy: userId ? new Types.ObjectId(userId) : undefined,
      relatedEntity,
      relatedEntityId: relatedEntityId
        ? new Types.ObjectId(relatedEntityId)
        : undefined,
    });

    return newFile.save();
  }

  async uploadToCloudinary(
    file: Express.Multer.File,
    folder: string,
  ): Promise<UploadApiResponse | UploadApiErrorResponse> {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: `client-portal/${folder}`,
        },
        (error, result) => {
          if (error) return reject(error);
          resolve(result as UploadApiResponse);
        },
      );

      streamifier.createReadStream(file.buffer).pipe(uploadStream);
    });
  }

  async findOne(id: string, tenantId: string): Promise<File> {
    const file = await this.fileModel.findOne({ _id: id, tenantId });
    if (!file) {
      throw new BadRequestException('File not found');
    }
    return file;
  }

  async deleteFile(id: string, tenantId: string): Promise<void> {
    const file = await this.findOne(id, tenantId);
    if (!file) {
      throw new BadRequestException('File not found');
    }

    await cloudinary.uploader.destroy(file.publicId);
    await this.fileModel.deleteOne({ _id: id });
  }

  async deleteByEntity(
    tenantId: string,
    relatedEntity: string,
    relatedEntityId: string,
  ): Promise<void> {
    const files = await this.fileModel.find({
      tenantId: new Types.ObjectId(tenantId),
      relatedEntity,
      relatedEntityId: new Types.ObjectId(relatedEntityId),
    });

    for (const file of files) {
      await cloudinary.uploader.destroy(file.publicId);
      await this.fileModel.deleteOne({ _id: file._id });
    }
  }
}
