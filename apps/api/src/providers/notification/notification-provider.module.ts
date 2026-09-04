import { Global, Module } from '@nestjs/common';
import { NotificationProviderService } from './notification-provider.service';

@Global()
@Module({
  providers: [NotificationProviderService],
  exports: [NotificationProviderService],
})
export class NotificationProviderModule {}
