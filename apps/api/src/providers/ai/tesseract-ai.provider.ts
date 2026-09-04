import { Injectable, Logger } from '@nestjs/common';
import { AiProviderInterface, AiExtractionResult } from './ai-provider.interface';
import { IAiExtractedField, IAiExtractedMenuItem, FoodType } from '@restaurant-os/types';
import { v4 as uuidv4 } from 'uuid';

// Dynamic import for Tesseract.js to avoid issues in non-Node environments
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { createWorker } = require('tesseract.js');

/**
 * Tesseract OCR-based AI provider.
 * Runs entirely locally — no external API calls.
 *
 * Pipeline:
 * 1. OCR the image to extract raw text
 * 2. Rule-based layout parser to identify menu structure
 * 3. Price/category/item name extraction using heuristics
 * 4. Confidence scoring
 *
 * Limitations:
 * - Image quality significantly impacts extraction accuracy
 * - Complex multi-column layouts may have lower accuracy
 * - Always marks uncertain fields as requiresReview=true
 */
@Injectable()
export class TesseractAiProvider implements AiProviderInterface {
  private readonly logger = new Logger(TesseractAiProvider.name);

  getProviderName(): string {
    return 'tesseract';
  }

  async isAvailable(): Promise<boolean> {
    try {
      // Tesseract.js is a WASM-based library — always available in Node
      return true;
    } catch {
      return false;
    }
  }

  async extractMenuFromImage(imageBuffer: Buffer, mimeType: string): Promise<AiExtractionResult> {
    const startTime = Date.now();
    this.logger.log({ msg: 'Starting OCR extraction', mimeType, sizeBytes: imageBuffer.length });

    let rawText = '';

    try {
      // Initialize Tesseract worker
      const worker = await createWorker('eng', 1, {
        logger: () => {}, // suppress verbose output
      });

      // Run OCR on the image buffer
      const { data } = await worker.recognize(imageBuffer);
      rawText = data.text;
      await worker.terminate();

      this.logger.log({
        msg: 'OCR completed',
        charCount: rawText.length,
        processingMs: Date.now() - startTime,
      });
    } catch (error) {
      this.logger.error('Tesseract OCR failed', error);
      throw new Error(`OCR processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    // Parse the extracted text into structured menu items
    const items = this.parseMenuText(rawText);
    const processingMs = Date.now() - startTime;
    const requiresReviewCount = items.filter((i) => i.requiresReview).length;
    const avgConfidence =
      items.length > 0
        ? items.reduce((sum, i) => sum + i.overallConfidence, 0) / items.length
        : 0;

    return {
      items,
      rawText,
      processingMs,
      provider: 'tesseract',
      confidence: avgConfidence,
      totalItemsFound: items.length,
      requiresReviewCount,
    };
  }

  /**
   * Rule-based menu text parser.
   *
   * Handles common menu text patterns:
   * - "Item Name ... Price" (price-on-right)
   * - "Price Item Name" (price-on-left)
   * - Category headers (ALL CAPS or followed by items)
   * - INR prices: ₹150, Rs.150, 150/-, 150.00
   */
  private parseMenuText(text: string): IAiExtractedMenuItem[] {
    const lines = text
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 1);

    const items: IAiExtractedMenuItem[] = [];
    let currentCategory = '';

    // Price pattern: ₹150, Rs 150, Rs.150, 150/-, 150.00, 150
    const pricePattern =
      /(?:₹|Rs\.?\s*|INR\s*)(\d{1,5}(?:\.\d{1,2})?)|(\d{1,5}(?:\.\d{1,2})?)(?:\s*(?:\/\-|Rs|₹))|^(\d{1,5})$/i;

    // Category detection: ALL CAPS line with no price
    const categoryPattern = /^[A-Z\s&'-]{3,50}$/;

    for (const line of lines) {
      if (!line || line.length < 2) continue;

      // Skip likely noise lines
      if (this.isNoiseLine(line)) continue;

      // Detect category header
      if (categoryPattern.test(line) && !pricePattern.test(line) && line.length < 50) {
        currentCategory = this.titleCase(line);
        continue;
      }

      // Try to extract a price from this line
      const priceMatch = line.match(pricePattern);
      const price = priceMatch
        ? parseFloat(priceMatch[1] || priceMatch[2] || priceMatch[3] || '0')
        : null;

      // Extract item name (line without price, truncated to reasonable length)
      const itemName = line
        .replace(pricePattern, '')
        .replace(/[.]{3,}/g, '') // remove leader dots "........"
        .trim();

      if (!itemName || itemName.length < 2) continue;
      if (itemName.length > 200) continue; // likely noise

      // Confidence scoring
      const nameConfidence = this.scoreNameConfidence(itemName);
      const priceConfidence = price !== null ? this.scorePriceConfidence(price) : 0.1;
      const overallConfidence = (nameConfidence + priceConfidence) / 2;

      const requiresReview = overallConfidence < 0.6 || price === null || price === 0;

      // Detect food type from name keywords
      const foodType = this.detectFoodType(itemName);

      const extractedItem: IAiExtractedMenuItem = {
        id: uuidv4(),
        categoryName: this.makeField(currentCategory || 'General', 0.7, !currentCategory),
        itemName: this.makeField(itemName, nameConfidence, nameConfidence < 0.5),
        description: this.makeField<string>(null, 0, true),
        price: this.makeField(price, priceConfidence, price === null || price === 0),
        foodType: this.makeField(foodType, foodType !== null ? 0.6 : 0.2, foodType === null),
        variants: this.makeField<string[]>([], 0.5, true),
        modifiers: this.makeField<string[]>([], 0.5, true),
        taxInfo: this.makeField<string>(null, 0, true),
        isAvailable: this.makeField(true, 0.9, false),
        notes: this.makeField<string>(null, 0, true),
        overallConfidence,
        requiresReview,
      };

      items.push(extractedItem);
    }

    // Post-process: merge lines that are clearly continuations
    return this.mergeRelatedLines(items);
  }

  private makeField<T>(
    value: T | null,
    confidence: number,
    requiresReview: boolean,
    rawText?: string,
  ): IAiExtractedField<T> {
    return {
      value,
      confidence: Math.min(1, Math.max(0, confidence)),
      requiresReview,
      rawText: rawText ?? null,
    };
  }

  private scoreNameConfidence(name: string): number {
    let score = 0.5;

    // Good signals
    if (name.length >= 3 && name.length <= 60) score += 0.2;
    if (/^[A-Z]/.test(name)) score += 0.1; // starts with capital
    if (!/^\d/.test(name)) score += 0.1; // doesn't start with number
    if (!/[^a-zA-Z0-9\s'&()-]/.test(name)) score += 0.1; // only normal characters

    // Bad signals
    if (name.length > 100) score -= 0.3;
    if (/^\d+$/.test(name)) score -= 0.4; // pure number
    if (name.split(' ').length > 8) score -= 0.2; // too many words
    if (/[|\\{}<>]/.test(name)) score -= 0.3; // OCR artifacts

    return Math.min(1, Math.max(0, score));
  }

  private scorePriceConfidence(price: number): number {
    if (price <= 0) return 0;
    if (price > 50000) return 0.1; // unreasonably high — NEVER invent prices
    if (price < 1) return 0.2;
    if (price >= 1 && price <= 5000) return 0.85;
    return 0.5;
  }

  private detectFoodType(name: string): FoodType | null {
    const lower = name.toLowerCase();

    const nonVegKeywords = [
      'chicken', 'mutton', 'lamb', 'beef', 'pork', 'fish', 'prawn', 'shrimp',
      'seafood', 'crab', 'lobster', 'egg', 'keema', 'biryani', 'kabab',
      'tikka', 'butter chicken', 'murg',
    ];
    const vegKeywords = [
      'paneer', 'veg', 'dal', 'chana', 'rajma', 'aloo', 'palak', 'mushroom',
      'garden', 'tofu', 'soya',
    ];

    for (const kw of nonVegKeywords) {
      if (lower.includes(kw)) return FoodType.NON_VEG;
    }
    for (const kw of vegKeywords) {
      if (lower.includes(kw)) return FoodType.VEG;
    }

    return null;
  }

  private isNoiseLine(line: string): boolean {
    // Filter common noise patterns
    const noisePatterns = [
      /^[\s\-_=*#.]+$/, // separator lines
      /^page\s+\d+/i, // page numbers
      /^tel|phone|www\.|http/i, // contact info
      /^[0-9]{10}$/, // phone numbers
      /^gst|fssai/i, // regulatory text
      /^\d{1,2}\/\d{1,2}\/\d{2,4}$/, // dates
    ];

    return noisePatterns.some((p) => p.test(line));
  }

  private titleCase(str: string): string {
    return str.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
  }

  private mergeRelatedLines(items: IAiExtractedMenuItem[]): IAiExtractedMenuItem[] {
    // If consecutive items have no price, they might be descriptions of the previous item
    // Simple heuristic: if an item has low name confidence and no price, skip it
    return items.filter((item) => {
      if (item.itemName.confidence < 0.3) return false;
      if (!item.price.value && item.itemName.value && (item.itemName.value as string).length < 3)
        return false;
      return true;
    });
  }
}
