import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { LoggerModule } from 'nestjs-pino';
import { BullModule } from '@nestjs/bull';

// Core modules
import { PrismaModule } from './common/prisma/prisma.module';
import { RedisModule } from './common/redis/redis.module';

// Provider modules
import { StorageModule } from './providers/storage/storage.module';
import { AiModule } from './providers/ai/ai.module';
import { PaymentProviderModule } from './providers/payment/payment-provider.module';
import { NotificationProviderModule } from './providers/notification/notification-provider.module';

// Domain modules
import { HealthModule } from './modules/health/health.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { RestaurantsModule } from './modules/restaurants/restaurants.module';
import { OutletsModule } from './modules/outlets/outlets.module';
import { FloorsModule } from './modules/floors/floors.module';
import { TablesModule } from './modules/tables/tables.module';
import { QrModule } from './modules/qr/qr.module';
import { MenuModule } from './modules/menu/menu.module';
import { AiMenuImportModule } from './modules/ai-menu-import/ai-menu-import.module';
import { CustomersModule } from './modules/customers/customers.module';
import { TableSessionsModule } from './modules/table-sessions/table-sessions.module';
import { OrdersModule } from './modules/orders/orders.module';
import { KitchenModule } from './modules/kitchen/kitchen.module';
import { BillsModule } from './modules/bills/bills.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { ReportsModule } from './modules/reports/reports.module';
import { StaffModule } from './modules/staff/staff.module';
import { FilesModule } from './modules/files/files.module';
import { AuditModule } from './modules/audit/audit.module';
import { SettingsModule } from './modules/settings/settings.module';
import { EventsModule } from './gateway/events.module';
import { validateEnv } from './common/config/env.validation';

@Module({
  imports: [
    // ─────────────────────────────────────────────
    // Configuration — validates env on startup
    // ─────────────────────────────────────────────
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
      envFilePath: ['.env.local', '.env'],
    }),

    // ─────────────────────────────────────────────
    // Structured logging (Pino)
    // ─────────────────────────────────────────────
    LoggerModule.forRootAsync({
      useFactory: (configService: ConfigService) => ({
        pinoHttp: {
          level: configService.get<string>('LOG_LEVEL', 'info'),
          transport:
            configService.get('NODE_ENV') !== 'production'
              ? { target: 'pino-pretty', options: { colorize: true } }
              : undefined,
          redact: ['req.headers.authorization', 'req.body.password', 'req.body.passwordHash'],
          customProps: () => ({ service: 'restaurant-os-api' }),
          serializers: {
            req: (req) => ({
              id: req.id,
              method: req.method,
              url: req.url,
              // Never log request bodies containing credentials
            }),
          },
        },
      }),
      inject: [ConfigService],
    }),

    // ─────────────────────────────────────────────
    // Rate limiting
    // ─────────────────────────────────────────────
    ThrottlerModule.forRootAsync({
      useFactory: (configService: ConfigService) => ({
        throttlers: [
          {
            ttl: configService.get<number>('THROTTLE_TTL_SECONDS', 60) * 1000,
            limit: configService.get<number>('THROTTLE_LIMIT', 100),
          },
        ],
      }),
      inject: [ConfigService],
    }),

    // ─────────────────────────────────────────────
    // Task scheduling
    // ─────────────────────────────────────────────
    ScheduleModule.forRoot(),

    // ─────────────────────────────────────────────
    // Background job queues (BullMQ via Bull)
    // ─────────────────────────────────────────────
    BullModule.forRootAsync({
      useFactory: (configService: ConfigService) => ({
        redis: {
          host: new URL(configService.get<string>('REDIS_URL', 'redis://localhost:6379')).hostname,
          port: parseInt(
            new URL(configService.get<string>('REDIS_URL', 'redis://localhost:6379')).port || '6379',
          ),
          password: configService.get<string>('REDIS_PASSWORD') || undefined,
        },
        defaultJobOptions: {
          removeOnComplete: 100,
          removeOnFail: 200,
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000,
          },
        },
      }),
      inject: [ConfigService],
    }),

    // ─────────────────────────────────────────────
    // Core infrastructure
    // ─────────────────────────────────────────────
    PrismaModule,
    RedisModule,

    // ─────────────────────────────────────────────
    // Provider abstractions
    // ─────────────────────────────────────────────
    StorageModule,
    AiModule,
    PaymentProviderModule,
    NotificationProviderModule,

    // ─────────────────────────────────────────────
    // Domain modules
    // ─────────────────────────────────────────────
    HealthModule,
    AuthModule,
    UsersModule,
    RestaurantsModule,
    OutletsModule,
    FloorsModule,
    TablesModule,
    QrModule,
    MenuModule,
    AiMenuImportModule,
    CustomersModule,
    TableSessionsModule,
    OrdersModule,
    KitchenModule,
    BillsModule,
    PaymentsModule,
    NotificationsModule,
    ReportsModule,
    StaffModule,
    FilesModule,
    AuditModule,
    SettingsModule,
    EventsModule,
  ],
})
export class AppModule {}
