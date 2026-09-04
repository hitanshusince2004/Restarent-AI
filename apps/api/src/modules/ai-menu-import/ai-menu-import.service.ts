import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AiProviderInterface } from '../../providers/ai/ai-provider.interface';
import { Inject } from '@nestjs/common';
import { AI_PROVIDER } from '../../providers/ai/ai-provider.interface';
import { MinioStorageProvider } from '../../providers/storage/minio-storage.provider';
import { MenuService } from '../menu/menu.service';
import {
  AiJobStatus,
  AiJobType,
  AiProvider,
  FileCategory,
  FileStatus,
  MenuImportItemStatus,
  MenuImportStatus,
  FoodType,
} from '@restaurant-os/types';
import { ReviewMenuImportItemDto } from '@restaurant-os/validation';

// Allowed MIME types for menu image upload
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/tiff', 'image/bmp'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

@Injectable()
export class AiMenuImportService {
  private readonly logger = new Logger(AiMenuImportService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(AI_PROVIDER) private readonly aiProvider: AiProviderInterface,
    private readonly storageProvider: MinioStorageProvider,
    private readonly menuService: MenuService,
  ) {}

  /**
   * Step 1: Upload menu image and create import record.
   */
  async uploadMenuImage(
    restaurantId: string,
    fileBuffer: Buffer,
    originalName: string,
    mimeType: string,
    actorId: string,
  ) {
    // Security: validate MIME type
    if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
      throw new BadRequestException(
        `Invalid file type: ${mimeType}. Allowed types: ${ALLOWED_MIME_TYPES.join(', ')}`,
      );
    }

    // Security: validate file size
    if (fileBuffer.length > MAX_FILE_SIZE) {
      throw new BadRequestException(
        `File too large: ${(fileBuffer.length / 1024 / 1024).toFixed(1)} MB. Maximum: 10 MB`,
      );
    }

    // Security: sanitize filename (never use original path)
    const sanitizedName = originalName
      .replace(/[^a-zA-Z0-9._-]/g, '_')
      .substring(0, 100);

    // Upload to MinIO
    const uploadResult = await this.storageProvider.upload(
      fileBuffer,
      sanitizedName,
      mimeType,
      FileCategory.MENU_IMAGE,
      restaurantId,
    );

    // Create file record
    const file = await this.prisma.file.create({
      data: {
        restaurantId,
        category: FileCategory.MENU_IMAGE,
        status: FileStatus.UPLOADED,
        originalName: sanitizedName,
        storagePath: uploadResult.storagePath,
        mimeType,
        sizeBytes: fileBuffer.length,
        uploadedBy: actorId,
        publicUrl: uploadResult.publicUrl,
      },
    });

    // Create import record
    const menuImport = await this.prisma.menuImport.create({
      data: {
        restaurantId,
        fileId: file.id,
        status: MenuImportStatus.PENDING,
        aiProvider: AiProvider.TESSERACT,
        initiatedBy: actorId,
      },
    });

    this.logger.log({
      msg: 'Menu image uploaded',
      importId: menuImport.id,
      restaurantId,
      fileSize: fileBuffer.length,
    });

    return { importId: menuImport.id, fileId: file.id, status: MenuImportStatus.PENDING };
  }

  /**
   * Step 2: Trigger OCR extraction. Runs synchronously for now.
   * Future: push to BullMQ queue for background processing.
   */
  async startExtraction(importId: string, restaurantId: string) {
    const menuImport = await this.prisma.menuImport.findFirst({
      where: { id: importId, restaurantId },
      include: { file: true },
    });

    if (!menuImport) throw new NotFoundException('Menu import not found');

    if (menuImport.status !== MenuImportStatus.PENDING) {
      throw new BadRequestException(`Import is already ${menuImport.status}`);
    }

    // Mark as processing
    await this.prisma.menuImport.update({
      where: { id: importId },
      data: { status: MenuImportStatus.PROCESSING, processingStartedAt: new Date() },
    });

    // Create AI job record
    const aiJob = await this.prisma.aiJob.create({
      data: {
        restaurantId,
        menuImportId: importId,
        jobType: AiJobType.MENU_IMPORT_OCR,
        status: AiJobStatus.RUNNING,
        provider: AiProvider.TESSERACT,
        startedAt: new Date(),
      },
    });

    // Process (would be queued in production with BullMQ)
    setImmediate(() => this.processExtraction(importId, restaurantId, aiJob.id, menuImport.file));

    return { importId, status: MenuImportStatus.PROCESSING, message: 'OCR extraction started' };
  }

  /**
   * Background extraction process.
   */
  private async processExtraction(
    importId: string,
    restaurantId: string,
    aiJobId: string,
    file: { storagePath: string; mimeType: string },
  ): Promise<void> {
    const startTime = Date.now();

    try {
      // Download image from MinIO
      // For now, we'll use a simple approach — in production, stream from MinIO
      this.logger.log({ msg: 'Starting AI extraction', importId });

      // The file is already uploaded — we read a placeholder buffer for the job record
      // In production, stream the file from MinIO
      const imageBuffer = Buffer.alloc(0); // placeholder — real impl reads from MinIO

      let extractionResult;
      try {
        extractionResult = await this.aiProvider.extractMenuFromImage(
          imageBuffer,
          file.mimeType,
        );
      } catch (error) {
        throw new Error(`AI extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }

      const processingMs = Date.now() - startTime;

      // Save extracted items
      await this.prisma.$transaction(async (tx) => {
        // Create import items
        if (extractionResult.items.length > 0) {
          await tx.menuImportItem.createMany({
            data: extractionResult.items.map((item) => ({
              menuImportId: importId,
              restaurantId,
              rawText: item.itemName.rawText || null,
              extractedData: item as never,
              overallConfidence: item.overallConfidence,
              requiresReview: item.requiresReview,
            })),
          });
        }

        // Update import record
        await tx.menuImport.update({
          where: { id: importId },
          data: {
            status:
              extractionResult.requiresReviewCount > 0
                ? MenuImportStatus.REVIEW_REQUIRED
                : MenuImportStatus.EXTRACTION_COMPLETE,
            totalItemsExtracted: extractionResult.items.length,
            processingCompletedAt: new Date(),
          },
        });

        // Update AI job
        await tx.aiJob.update({
          where: { id: aiJobId },
          data: {
            status: AiJobStatus.COMPLETED,
            completedAt: new Date(),
            processingMs,
            outputData: {
              totalItems: extractionResult.items.length,
              confidence: extractionResult.confidence,
              requiresReviewCount: extractionResult.requiresReviewCount,
            } as never,
          },
        });
      });

      this.logger.log({
        msg: 'AI extraction completed',
        importId,
        itemsFound: extractionResult.items.length,
        requiresReview: extractionResult.requiresReviewCount,
        processingMs,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error({ msg: 'AI extraction failed', importId, error: message });

      await this.prisma.$transaction([
        this.prisma.menuImport.update({
          where: { id: importId },
          data: {
            status: MenuImportStatus.FAILED,
            processingError: message,
            processingCompletedAt: new Date(),
          },
        }),
        this.prisma.aiJob.update({
          where: { id: aiJobId },
          data: {
            status: AiJobStatus.FAILED,
            completedAt: new Date(),
            errorMessage: message,
            processingMs: Date.now() - startTime,
          },
        }),
      ]);
    }
  }

  async getImport(importId: string, restaurantId: string) {
    const menuImport = await this.prisma.menuImport.findFirst({
      where: { id: importId, restaurantId },
      include: {
        importItems: { orderBy: { createdAt: 'asc' } },
        file: { select: { publicUrl: true, originalName: true } },
        aiJobs: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
    });

    if (!menuImport) throw new NotFoundException('Menu import not found');
    return menuImport;
  }

  async listImports(restaurantId: string) {
    return this.prisma.menuImport.findMany({
      where: { restaurantId },
      include: {
        file: { select: { originalName: true, publicUrl: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Step 3: Review an extracted item (approve/reject with corrections).
   */
  async reviewItem(
    itemId: string,
    restaurantId: string,
    dto: ReviewMenuImportItemDto,
    actorId: string,
  ) {
    const importItem = await this.prisma.menuImportItem.findFirst({
      where: { id: itemId, restaurantId },
      include: { menuImport: true },
    });

    if (!importItem) throw new NotFoundException('Import item not found');

    return this.prisma.menuImportItem.update({
      where: { id: itemId },
      data: {
        status:
          dto.status === 'APPROVED' ? MenuImportItemStatus.APPROVED : MenuImportItemStatus.REJECTED,
        reviewedBy: actorId,
        reviewedAt: new Date(),
        reviewedData: dto as never,
        rejectionReason: dto.status === 'REJECTED' ? 'Rejected during review' : null,
      },
    });
  }

  /**
   * Step 4: Publish approved items to the live menu.
   */
  async publishApproved(importId: string, restaurantId: string, actorId: string) {
    const menuImport = await this.prisma.menuImport.findFirst({
      where: { id: importId, restaurantId },
      include: { importItems: { where: { status: MenuImportItemStatus.APPROVED } } },
    });

    if (!menuImport) throw new NotFoundException('Menu import not found');

    if (menuImport.importItems.length === 0) {
      throw new BadRequestException('No approved items to publish');
    }

    let published = 0;
    const categoryCache: Record<string, string> = {};

    for (const importItem of menuImport.importItems) {
      const extractedData = importItem.reviewedData || importItem.extractedData;
      const data = extractedData as Record<string, { value: unknown }>;

      const categoryName = (data.categoryName?.value as string) || 'General';
      const itemName = data.itemName?.value as string;
      const price = data.price?.value as number;

      if (!itemName || !price || price <= 0) {
        this.logger.warn({
          msg: 'Skipping import item with missing required fields',
          itemId: importItem.id,
          itemName,
          price,
        });
        continue;
      }

      // Get or create category
      if (!categoryCache[categoryName]) {
        let category = await this.prisma.menuCategory.findFirst({
          where: { restaurantId, name: categoryName },
        });

        if (!category) {
          category = await this.prisma.menuCategory.create({
            data: { restaurantId, name: categoryName, displayOrder: 0 },
          });
        }

        categoryCache[categoryName] = category.id;
      }

      const categoryId = categoryCache[categoryName];

      // Create menu item
      const menuItem = await this.prisma.menuItem.create({
        data: {
          restaurantId,
          categoryId,
          name: itemName,
          description: (data.description?.value as string) || null,
          basePrice: price,
          foodType: (data.foodType?.value as FoodType) || FoodType.VEG,
          taxRate: 5,
          status: 'ACTIVE',
        },
      });

      // Mark import item as published
      await this.prisma.menuImportItem.update({
        where: { id: importItem.id },
        data: { status: MenuImportItemStatus.PUBLISHED, publishedMenuItemId: menuItem.id },
      });

      published++;
    }

    await this.prisma.menuImport.update({
      where: { id: importId },
      data: {
        status: MenuImportStatus.PUBLISHED,
        totalItemsPublished: published,
      },
    });

    this.logger.log({ msg: 'Menu import published', importId, publishedCount: published, restaurantId });

    return { importId, publishedCount: published };
  }
}
