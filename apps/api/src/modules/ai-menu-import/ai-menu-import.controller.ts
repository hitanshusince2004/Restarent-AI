import {
  Controller,
  Post,
  Get,
  Patch,
  Param,
  Body,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiConsumes } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { AiMenuImportService } from './ai-menu-import.service';
import { CurrentUser } from '../../common/decorators/user.decorators';
import { RequirePermissions } from '../../common/decorators/auth.decorators';
import { JwtPayload } from '../auth/types/jwt-payload.type';
import { Permission } from '@restaurant-os/types';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { reviewMenuImportItemSchema } from '@restaurant-os/validation';

@ApiTags('Menu Import')
@ApiBearerAuth('JWT')
@Controller({ path: 'restaurants/:restaurantId/menu-import', version: '1' })
export class AiMenuImportController {
  constructor(private readonly aiMenuImportService: AiMenuImportService) {}

  @Post('upload')
  @RequirePermissions(Permission.MENU_IMPORT_CREATE)
  @ApiOperation({ summary: 'Step 1: Upload a menu photograph/document for AI extraction' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  async upload(
    @Param('restaurantId') restaurantId: string,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: JwtPayload,
  ) {
    if (!file) throw new BadRequestException('Image file is required');

    return this.aiMenuImportService.uploadMenuImage(
      restaurantId,
      file.buffer,
      file.originalname,
      file.mimetype,
      user.sub,
    );
  }

  @Post(':importId/start')
  @RequirePermissions(Permission.MENU_IMPORT_CREATE)
  @ApiOperation({ summary: 'Step 2: Start OCR and AI parsing pipeline on uploaded image' })
  async startExtraction(
    @Param('restaurantId') restaurantId: string,
    @Param('importId') importId: string,
  ) {
    return this.aiMenuImportService.startExtraction(importId, restaurantId);
  }

  @Get()
  @RequirePermissions(Permission.MENU_IMPORT_REVIEW)
  @ApiOperation({ summary: 'List all menu import jobs for the restaurant' })
  async listImports(@Param('restaurantId') restaurantId: string) {
    return this.aiMenuImportService.listImports(restaurantId);
  }

  @Get(':importId')
  @RequirePermissions(Permission.MENU_IMPORT_REVIEW)
  @ApiOperation({ summary: 'Get details and extracted items of a menu import job' })
  async getImport(
    @Param('restaurantId') restaurantId: string,
    @Param('importId') importId: string,
  ) {
    return this.aiMenuImportService.getImport(importId, restaurantId);
  }

  @Patch('items/:itemId/review')
  @RequirePermissions(Permission.MENU_IMPORT_REVIEW)
  @ApiOperation({ summary: 'Step 3: Human review and correct AI extracted item before publishing' })
  async reviewItem(
    @Param('restaurantId') restaurantId: string,
    @Param('itemId') itemId: string,
    @Body(new ZodValidationPipe(reviewMenuImportItemSchema)) body: ReturnType<typeof reviewMenuImportItemSchema.parse>,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.aiMenuImportService.reviewItem(itemId, restaurantId, body, user.sub);
  }

  @Post(':importId/publish')
  @RequirePermissions(Permission.MENU_PUBLISH)
  @ApiOperation({ summary: 'Step 4: Publish all approved AI-extracted items to live menu' })
  async publish(
    @Param('restaurantId') restaurantId: string,
    @Param('importId') importId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.aiMenuImportService.publishApproved(importId, restaurantId, user.sub);
  }
}
