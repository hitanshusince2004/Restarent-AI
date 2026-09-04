import { Module } from '@nestjs/common';
import { AiMenuImportController } from './ai-menu-import.controller';
import { AiMenuImportService } from './ai-menu-import.service';
import { MenuModule } from '../menu/menu.module';

@Module({
  imports: [MenuModule],
  controllers: [AiMenuImportController],
  providers: [AiMenuImportService],
  exports: [AiMenuImportService],
})
export class AiMenuImportModule {}
