import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AI_PROVIDER } from './ai-provider.interface';
import { TesseractAiProvider } from './tesseract-ai.provider';

@Global()
@Module({
  providers: [
    TesseractAiProvider,
    {
      provide: AI_PROVIDER,
      useFactory: (configService: ConfigService, tesseract: TesseractAiProvider) => {
        const aiProvider = configService.get<string>('AI_PROVIDER', 'tesseract');
        switch (aiProvider) {
          case 'tesseract':
            return tesseract;
          case 'none':
            return tesseract; // fall back to tesseract
          default:
            return tesseract;
        }
      },
      inject: [ConfigService, TesseractAiProvider],
    },
  ],
  exports: [AI_PROVIDER, TesseractAiProvider],
})
export class AiModule {}
