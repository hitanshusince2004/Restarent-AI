import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { MinioStorageProvider } from '../../providers/storage/minio-storage.provider';
import { FileCategory, FileStatus } from '@restaurant-os/types';

const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/svg+xml',
  'application/pdf',
];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

@Injectable()
export class FilesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storageProvider: MinioStorageProvider,
  ) {}

  async uploadFile(
    fileBuffer: Buffer,
    originalName: string,
    mimeType: string,
    category: FileCategory,
    restaurantId: string,
    userId: string,
  ) {
    if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
      throw new BadRequestException(`Disallowed file type: ${mimeType}`);
    }
    if (fileBuffer.length > MAX_FILE_SIZE) {
      throw new BadRequestException('File exceeds 10MB limit');
    }

    const sanitizedName = originalName.replace(/[^a-zA-Z0-9._-]/g, '_').substring(0, 100);

    const uploadResult = await this.storageProvider.upload(
      fileBuffer,
      sanitizedName,
      mimeType,
      category,
      restaurantId,
    );

    return this.prisma.file.create({
      data: {
        restaurantId,
        category,
        status: FileStatus.UPLOADED,
        originalName: sanitizedName,
        storagePath: uploadResult.storagePath,
        mimeType,
        sizeBytes: fileBuffer.length,
        uploadedBy: userId,
        publicUrl: uploadResult.publicUrl,
      },
    });
  }

  async findOne(fileId: string, restaurantId: string) {
    const file = await this.prisma.file.findFirst({
      where: { id: fileId, restaurantId, deletedAt: null },
    });
    if (!file) throw new NotFoundException('File not found');
    return file;
  }

  async delete(fileId: string, restaurantId: string) {
    const file = await this.prisma.file.findFirst({
      where: { id: fileId, restaurantId, deletedAt: null },
    });
    if (!file) throw new NotFoundException('File not found');

    await this.storageProvider.delete(file.storagePath);
    await this.prisma.file.update({
      where: { id: fileId },
      data: { deletedAt: new Date(), status: FileStatus.DELETED },
    });

    return { message: 'File deleted' };
  }
}
