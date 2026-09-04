import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { CustomersService } from './customers.service';
import { RequirePermissions } from '../../common/decorators/auth.decorators';
import { Permission } from '@restaurant-os/types';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { paginationSchema } from '@restaurant-os/validation';

@ApiTags('Customers')
@ApiBearerAuth('JWT')
@Controller({ path: 'restaurants/:restaurantId/customers', version: '1' })
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Get()
  @RequirePermissions(Permission.CUSTOMERS_READ)
  @ApiOperation({ summary: 'List customer profiles' })
  async findAll(
    @Param('restaurantId') restaurantId: string,
    @Query(new ZodValidationPipe(paginationSchema)) pagination: { page: number; limit: number },
  ) {
    return this.customersService.findAll(restaurantId, pagination);
  }

  @Get(':customerId')
  @RequirePermissions(Permission.CUSTOMERS_READ)
  @ApiOperation({ summary: 'Get customer profile and order history' })
  async findOne(
    @Param('restaurantId') restaurantId: string,
    @Param('customerId') customerId: string,
  ) {
    return this.customersService.findOne(customerId, restaurantId);
  }
}
