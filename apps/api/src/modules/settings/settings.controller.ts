import { Controller, Get, Patch, Param, Body } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { SettingsService } from './settings.service';
import { CurrentUser } from '../../common/decorators/user.decorators';
import { RequirePermissions } from '../../common/decorators/auth.decorators';
import { JwtPayload } from '../auth/types/jwt-payload.type';
import { Permission } from '@restaurant-os/types';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { updateSettingsSchema } from '@restaurant-os/validation';

@ApiTags('Settings')
@ApiBearerAuth('JWT')
@Controller({ path: 'restaurants/:restaurantId/settings', version: '1' })
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  @RequirePermissions(Permission.SETTINGS_MANAGE)
  @ApiOperation({ summary: 'Get restaurant configuration key-value settings' })
  async getSettings(@Param('restaurantId') restaurantId: string) {
    return this.settingsService.getSettings(restaurantId);
  }

  @Patch()
  @RequirePermissions(Permission.SETTINGS_MANAGE)
  @ApiOperation({ summary: 'Update restaurant configuration key-value settings' })
  async updateSettings(
    @Param('restaurantId') restaurantId: string,
    @Body(new ZodValidationPipe(updateSettingsSchema)) body: ReturnType<typeof updateSettingsSchema.parse>,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.settingsService.updateSettings(restaurantId, body.settings, user.sub);
  }
}
