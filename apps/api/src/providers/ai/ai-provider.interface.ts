import { IAiExtractedMenuItem } from '@restaurant-os/types';

export interface AiExtractionResult {
  items: IAiExtractedMenuItem[];
  rawText: string;
  processingMs: number;
  provider: string;
  confidence: number;
  totalItemsFound: number;
  requiresReviewCount: number;
}

export interface AiProviderInterface {
  extractMenuFromImage(imageBuffer: Buffer, mimeType: string): Promise<AiExtractionResult>;
  isAvailable(): Promise<boolean>;
  getProviderName(): string;
}

export const AI_PROVIDER = Symbol('AI_PROVIDER');
