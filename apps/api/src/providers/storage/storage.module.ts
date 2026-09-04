import { Global, Module } from '@nestjs/common';
import { MinioStorageProvider } from './minio-storage.provider';
import { STORAGE_PROVIDER } from './storage-provider.interface';

@Global()
@Module({
  providers: [
    {
      provide: STORAGE_PROVIDER,
      useClass: MinioStorageProvider,
    },
    MinioStorageProvider,
  ],
  exports: [STORAGE_PROVIDER, MinioStorageProvider],
})
export class StorageModule {}
