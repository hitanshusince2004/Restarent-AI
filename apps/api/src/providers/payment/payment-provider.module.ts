import { Global, Module } from '@nestjs/common';
import { PaymentProviderService } from './payment-provider.service';

@Global()
@Module({
  providers: [PaymentProviderService],
  exports: [PaymentProviderService],
})
export class PaymentProviderModule {}
