import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { Logger } from 'nestjs-pino';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { RequestIdInterceptor } from './common/interceptors/request-id.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    // Disable built-in logger — Pino takes over
    bufferLogs: true,
  });

  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT', 3001);
  const corsOrigins = configService
    .get<string>('CORS_ORIGINS', 'http://localhost:3000')
    .split(',')
    .map((o) => o.trim());

  // ─────────────────────────────────────────────
  // Structured logging (Pino)
  // ─────────────────────────────────────────────
  app.useLogger(app.get(Logger));

  // ─────────────────────────────────────────────
  // Security headers
  // ─────────────────────────────────────────────
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", 'data:', 'blob:'],
        },
      },
      crossOriginEmbedderPolicy: false,
    }),
  );

  // ─────────────────────────────────────────────
  // CORS (Permissive for local development & phone LAN access)
  // ─────────────────────────────────────────────
  app.enableCors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (
        corsOrigins.includes(origin) ||
        /^https?:\/\/(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.\d+\.\d+\.\d+)(:\d+)?$/.test(origin)
      ) {
        return callback(null, true);
      }
      return callback(null, true);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID', 'X-Idempotency-Key'],
  });

  // ─────────────────────────────────────────────
  // Cookie parser (for refresh tokens in httpOnly cookies)
  // ─────────────────────────────────────────────
  app.use(cookieParser());

  // ─────────────────────────────────────────────
  // API versioning
  // ─────────────────────────────────────────────
  app.setGlobalPrefix('api');
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });

  // ─────────────────────────────────────────────
  // Global validation pipe (strict mode)
  // ─────────────────────────────────────────────
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // strip unknown properties
      forbidNonWhitelisted: false, // we use Zod in services for extra safety
      transform: true,
      transformOptions: {
        enableImplicitConversion: false,
      },
    }),
  );

  // ─────────────────────────────────────────────
  // Global interceptors
  // ─────────────────────────────────────────────
  app.useGlobalInterceptors(new RequestIdInterceptor(), new ResponseInterceptor());

  // ─────────────────────────────────────────────
  // Global exception filter
  // ─────────────────────────────────────────────
  app.useGlobalFilters(new GlobalExceptionFilter());

  // ─────────────────────────────────────────────
  // Swagger / OpenAPI
  // ─────────────────────────────────────────────
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Restaurant OS API')
    .setDescription(
      'AI-powered multi-tenant Restaurant Operating System API.\n\n' +
        'Authentication: Bearer JWT token in Authorization header.\n' +
        'All monetary values are strings representing Decimal numbers.',
    )
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'Authorization',
        description: 'Enter JWT access token',
        in: 'header',
      },
      'JWT',
    )
    .addTag('Health', 'Application health and readiness checks')
    .addTag('Auth', 'Authentication and authorization')
    .addTag('Users', 'User profile management')
    .addTag('Restaurants', 'Restaurant management')
    .addTag('Outlets', 'Outlet management')
    .addTag('Floors', 'Floor plan management')
    .addTag('Tables', 'Table management')
    .addTag('QR', 'QR code generation and management')
    .addTag('Menu', 'Menu categories, items, variants, modifiers')
    .addTag('Menu Import', 'AI-powered menu import from images')
    .addTag('Table Sessions', 'Table session lifecycle')
    .addTag('Orders', 'Order management')
    .addTag('Kitchen', 'Kitchen display system')
    .addTag('Bills', 'Billing management')
    .addTag('Payments', 'Payment processing')
    .addTag('Customers', 'Customer management')
    .addTag('Staff', 'Staff and RBAC management')
    .addTag('Reports', 'Analytics and reporting')
    .addTag('Notifications', 'Notification management')
    .addTag('Files', 'File upload and management')
    .addTag('Settings', 'Restaurant settings')
    .addTag('Audit', 'Audit log access')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      tagsSorter: 'alpha',
    },
  });

  await app.listen(port, '0.0.0.0');
  console.log(`\n🚀 Restaurant OS API running on http://0.0.0.0:${port} (accessible via LAN IP)`);
  console.log(`📚 Swagger docs: http://localhost:${port}/api/docs`);
  console.log(`🏥 Health check: http://localhost:${port}/api/v1/health\n`);
}

bootstrap().catch((err) => {
  console.error('Fatal error during bootstrap:', err);
  process.exit(1);
});
