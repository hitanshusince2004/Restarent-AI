import { Module } from '@nestjs/common';
import { BillsController } from './bills.controller';
import { BillsService } from './bills.service';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [AuditModule],
  controllers: [BillsController],
  providers: [BillsService],
  exports: [BillsService],
})
export class BillsModule {}
