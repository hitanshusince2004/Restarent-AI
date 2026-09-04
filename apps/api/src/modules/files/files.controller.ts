import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  UseInterceptors,
  UploadedFile,
  Body,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiConsumes } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { FilesService } from './files.service';
import { CurrentUser } from '../../common/decorators/user.decorators';
import { JwtPayload } from '../auth/types/jwt-payload.type';
import { FileCategory } from '@restaurant-os/types';

@ApiTags('Files')
@ApiBearerAuth('JWT')
@Controller({ path: 'restaurants/:restaurantId/files', version: '1' })
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @Post('upload')
  @ApiOperation({ summary: 'Upload file (logos, menu item photos, docs)' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  async upload(
    @Param('restaurantId') restaurantId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body('category') category: string,
    @CurrentUser() user: JwtPayload,
  ) {
    if (!file) throw new BadRequestException('File is required');
    const validCategory = (category as FileCategory) || FileCategory.MENU_ITEM_IMAGE;

    return this.filesService.uploadFile(
      file.buffer,
      file.originalname,
      file.mimetype,
      validCategory,
      restaurantId,
      user.sub,
    );
  }

  @Get(':fileId')
  @ApiOperation({ summary: 'Get file metadata and public URL' })
  async findOne(
    @Param('restaurantId') restaurantId: string,
    @Param('fileId') fileId: string,
  ) {
    return this.filesService.findOne(fileId, restaurantId);
  }

  @Delete(':fileId')
  @ApiOperation({ summary: 'Delete file' })
  async delete(
    @Param('restaurantId') restaurantId: string,
    @Param('fileId') fileId: string,
  ) {
    return this.filesService.delete(fileId, restaurantId);
  }
}
