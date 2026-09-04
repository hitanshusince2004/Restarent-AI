import { Module } from '@nestjs/common';
import { TableSessionsController } from './table-sessions.controller';
import { TableSessionsService } from './table-sessions.service';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [AuditModule],
  controllers: [TableSessionsController],
  providers: [TableSessionsService],
  exports: [TableSessionsService],
})
export class TableSessionsModule {}
