import { FileCategory } from '@restaurant-os/types';

export interface UploadResult {
  storagePath: string;
  publicUrl: string;
  sizeBytes: number;
  mimeType: string;
}

export interface StorageProviderInterface {
  upload(
    buffer: Buffer,
    filename: string,
    mimeType: string,
    category: FileCategory,
    restaurantId?: string,
  ): Promise<UploadResult>;

  delete(storagePath: string): Promise<void>;

  getSignedUrl(storagePath: string, expiresInSeconds: number): Promise<string>;

  getPublicUrl(storagePath: string): string;
}

export const STORAGE_PROVIDER = Symbol('STORAGE_PROVIDER');
