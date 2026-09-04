import { Module } from '@nestjs/common';
import { RestaurantsController } from './restaurants.controller';
import { RestaurantsService } from './restaurants.service';
import { StaffModule } from '../staff/staff.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [StaffModule, AuditModule],
  controllers: [RestaurantsController],
  providers: [RestaurantsService],
  exports: [RestaurantsService],
})
export class RestaurantsModule {}
