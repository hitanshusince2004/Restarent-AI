import { Global, Module } from '@nestjs/common';
import { StaffController } from './staff.controller';
import { StaffService } from './staff.service';
import { RbacService } from './rbac.service';
import { AuditModule } from '../audit/audit.module';

@Global()
@Module({
  imports: [AuditModule],
  controllers: [StaffController],
  providers: [StaffService, RbacService],
  exports: [StaffService, RbacService],
})
export class StaffModule {}
