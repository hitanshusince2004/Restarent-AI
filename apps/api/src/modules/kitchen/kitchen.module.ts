import { Module } from '@nestjs/common';
import { KitchenController } from './kitchen.controller';
import { KitchenService } from './kitchen.service';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [AuditModule],
  controllers: [KitchenController],
  providers: [KitchenService],
  exports: [KitchenService],
})
export class KitchenModule {}
