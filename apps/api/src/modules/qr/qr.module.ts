import { Module } from '@nestjs/common';
import { QrController } from './qr.controller';
import { QrService } from './qr.service';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [AuditModule],
  controllers: [QrController],
  providers: [QrService],
  exports: [QrService],
})
export class QrModule {}
