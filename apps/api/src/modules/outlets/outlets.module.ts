import { Module } from '@nestjs/common';
import { OutletsController } from './outlets.controller';
import { OutletsService } from './outlets.service';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [AuditModule],
  controllers: [OutletsController],
  providers: [OutletsService],
  exports: [OutletsService],
})
export class OutletsModule {}
