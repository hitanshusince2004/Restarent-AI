import { Controller, Get, Patch, Body } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CurrentUser } from '../../common/decorators/user.decorators';
import { JwtPayload } from '../auth/types/jwt-payload.type';

@ApiTags('Users')
@ApiBearerAuth('JWT')
@Controller({ path: 'users', version: '1' })
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('profile')
  @ApiOperation({ summary: 'Get current user profile' })
  async getProfile(@CurrentUser() user: JwtPayload) {
    return this.usersService.getProfile(user.sub);
  }

  @Patch('profile')
  @ApiOperation({ summary: 'Update user profile' })
  async updateProfile(
    @CurrentUser() user: JwtPayload,
    @Body() body: { name?: string; phone?: string },
  ) {
    return this.usersService.updateProfile(user.sub, body);
  }
}
