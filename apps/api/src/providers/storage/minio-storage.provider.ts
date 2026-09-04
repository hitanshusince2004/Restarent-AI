import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Minio from 'minio';
import { v4 as uuidv4 } from 'uuid';
import * as path from 'path';
import { FileCategory } from '@restaurant-os/types';
import { StorageProviderInterface, UploadResult } from './storage-provider.interface';

@Injectable()
export class MinioStorageProvider implements StorageProviderInterface, OnModuleInit {
  private readonly logger = new Logger(MinioStorageProvider.name);
  private readonly client: Minio.Client;
  private readonly menuImagesBucket: string;
  private readonly filesBucket: string;
  private readonly publicUrl: string;

  constructor(private readonly configService: ConfigService) {
    this.client = new Minio.Client({
      endPoint: configService.get<string>('MINIO_ENDPOINT', 'localhost'),
      port: configService.get<number>('MINIO_PORT', 9000),
      useSSL: configService.get<boolean>('MINIO_USE_SSL', false),
      accessKey: configService.get<string>('MINIO_ACCESS_KEY', 'minioadmin'),
      secretKey: configService.get<string>('MINIO_SECRET_KEY', 'minioadmin123'),
    });

    this.menuImagesBucket = configService.get<string>('MINIO_BUCKET_MENU_IMAGES', 'menu-images');
    this.filesBucket = configService.get<string>('MINIO_BUCKET_FILES', 'files');
    this.publicUrl = configService.get<string>('MINIO_PUBLIC_URL', 'http://localhost:9000');
  }

  async onModuleInit(): Promise<void> {
    await this.ensureBucketsExist();
  }

  private async ensureBucketsExist(): Promise<void> {
    const buckets = [this.menuImagesBucket, this.filesBucket];
    for (const bucket of buckets) {
      try {
        const exists = await this.client.bucketExists(bucket);
        if (!exists) {
          await this.client.makeBucket(bucket);
          this.logger.log(`Created MinIO bucket: ${bucket}`);
        }
      } catch (error) {
        this.logger.error(`Failed to ensure bucket ${bucket} exists:`, error);
      }
    }
  }

  private getBucketForCategory(category: FileCategory): string {
    switch (category) {
      case FileCategory.MENU_IMAGE:
      case FileCategory.MENU_ITEM_IMAGE:
      case FileCategory.RESTAURANT_LOGO:
        return this.menuImagesBucket;
      default:
        return this.filesBucket;
    }
  }

  private generateStoragePath(
    filename: string,
    category: FileCategory,
    restaurantId?: string,
  ): string {
    const ext = path.extname(filename).toLowerCase();
    const uniqueId = uuidv4();
    const date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const prefix = restaurantId ? `restaurants/${restaurantId}` : 'uploads';

    return `${prefix}/${category.toLowerCase()}/${date}/${uniqueId}${ext}`;
  }

  async upload(
    buffer: Buffer,
    filename: string,
    mimeType: string,
    category: FileCategory,
    restaurantId?: string,
  ): Promise<UploadResult> {
    const bucket = this.getBucketForCategory(category);
    const storagePath = this.generateStoragePath(filename, category, restaurantId);

    await this.client.putObject(bucket, storagePath, buffer, buffer.length, {
      'Content-Type': mimeType,
      'X-Restaurant-Id': restaurantId || 'unknown',
    });

    const publicUrl = `${this.publicUrl}/${bucket}/${storagePath}`;

    this.logger.debug({ msg: 'File uploaded', storagePath, bucket, sizeBytes: buffer.length });

    return {
      storagePath: `${bucket}/${storagePath}`,
      publicUrl,
      sizeBytes: buffer.length,
      mimeType,
    };
  }

  async delete(fullStoragePath: string): Promise<void> {
    // fullStoragePath format: "bucket/path/to/file"
    const separatorIndex = fullStoragePath.indexOf('/');
    if (separatorIndex === -1) {
      this.logger.warn(`Invalid storage path for deletion: ${fullStoragePath}`);
      return;
    }

    const bucket = fullStoragePath.substring(0, separatorIndex);
    const objectPath = fullStoragePath.substring(separatorIndex + 1);

    await this.client.removeObject(bucket, objectPath);
    this.logger.debug({ msg: 'File deleted', storagePath: fullStoragePath });
  }

  async getSignedUrl(fullStoragePath: string, expiresInSeconds: number): Promise<string> {
    const separatorIndex = fullStoragePath.indexOf('/');
    if (separatorIndex === -1) return fullStoragePath;

    const bucket = fullStoragePath.substring(0, separatorIndex);
    const objectPath = fullStoragePath.substring(separatorIndex + 1);

    return this.client.presignedGetObject(bucket, objectPath, expiresInSeconds);
  }

  getPublicUrl(fullStoragePath: string): string {
    return `${this.publicUrl}/${fullStoragePath}`;
  }
}
