import {
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
  Body,
  UseGuards,
  Request,
  Get,
  Param,
  Delete,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { FilesService } from './files.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../auth/guards/tenant.guard';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import type { RequestWithUser } from '../../common/interfaces/request-with-user.interface';

@ApiTags('files')
@ApiBearerAuth()
@Controller('files')
@UseGuards(JwtAuthGuard, TenantGuard)
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @Post('upload')
  @ApiOperation({ summary: 'Upload a file to Cloudinary' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        relatedEntity: { type: 'string' },
        relatedEntityId: { type: 'string' },
      },
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @Request() req: RequestWithUser,
    @Body('relatedEntity') relatedEntity?: string,
    @Body('relatedEntityId') relatedEntityId?: string,
  ) {
    return this.filesService.uploadFile(
      file,
      req.user.tenantId.toString(),
      req.user._id.toString(),
      relatedEntity,
      relatedEntityId,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get file details by ID' })
  async findOne(@Param('id') id: string, @Request() req: RequestWithUser) {
    return this.filesService.findOne(id, req.user.tenantId.toString());
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a file' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param('id') id: string, @Request() req: RequestWithUser) {
    return this.filesService.deleteFile(id, req.user.tenantId.toString());
  }
}
