import { z } from 'zod';

/**
 * Environment variable schema. Application fails to start
 * if any required variable is missing or invalid.
 * This is the single source of truth for required config.
 */
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3001),
  API_URL: z.string().url().default('http://localhost:3001'),
  WEB_URL: z.string().url().default('http://localhost:3000'),

  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),

  REDIS_URL: z.string().min(1, 'REDIS_URL is required').default('redis://localhost:6379'),
  REDIS_PASSWORD: z.string().optional().default(''),

  JWT_ACCESS_SECRET: z
    .string()
    .min(32, 'JWT_ACCESS_SECRET must be at least 32 characters')
    .refine(
      (s) => !s.startsWith('REPLACE_WITH'),
      'JWT_ACCESS_SECRET must be set to a real secret',
    ),
  JWT_REFRESH_SECRET: z
    .string()
    .min(32, 'JWT_REFRESH_SECRET must be at least 32 characters')
    .refine(
      (s) => !s.startsWith('REPLACE_WITH'),
      'JWT_REFRESH_SECRET must be set to a real secret',
    ),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),

  MINIO_ENDPOINT: z.string().min(1).default('localhost'),
  MINIO_PORT: z.coerce.number().int().positive().default(9000),
  MINIO_USE_SSL: z.coerce.boolean().default(false),
  MINIO_ACCESS_KEY: z.string().min(1).default('minioadmin'),
  MINIO_SECRET_KEY: z.string().min(1).default('minioadmin123'),
  MINIO_BUCKET_MENU_IMAGES: z.string().default('menu-images'),
  MINIO_BUCKET_FILES: z.string().default('files'),
  MINIO_PUBLIC_URL: z.string().url().default('http://localhost:9000'),

  AI_PROVIDER: z.enum(['tesseract', 'ollama', 'none']).default('tesseract'),
  OLLAMA_BASE_URL: z.string().url().default('http://localhost:11434'),
  OLLAMA_MODEL: z.string().default('llava'),

  PAYMENT_PROVIDER: z.enum(['manual', 'razorpay']).default('manual'),

  NOTIFICATION_PROVIDER: z.enum(['console', 'smtp']).default('console'),
  SMTP_HOST: z.string().optional().default(''),
  SMTP_PORT: z.coerce.number().int().positive().optional().default(587),
  SMTP_SECURE: z.coerce.boolean().optional().default(false),
  SMTP_USER: z.string().optional().default(''),
  SMTP_PASSWORD: z.string().optional().default(''),
  SMTP_FROM: z.string().optional().default('Restaurant OS <noreply@restaurant-os.local>'),

  THROTTLE_TTL_SECONDS: z.coerce.number().int().positive().default(60),
  THROTTLE_LIMIT: z.coerce.number().int().positive().default(100),
  AUTH_THROTTLE_TTL_SECONDS: z.coerce.number().int().positive().default(60),
  AUTH_THROTTLE_LIMIT: z.coerce.number().int().positive().default(10),

  MAX_FILE_SIZE_BYTES: z.coerce.number().int().positive().default(10485760),

  CORS_ORIGINS: z.string().default('http://localhost:3000'),

  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),

  DEFAULT_CURRENCY: z.string().default('INR'),
  DEFAULT_TAX_RATE: z.coerce.number().default(5),
});

export type EnvConfig = z.infer<typeof envSchema>;

export function validateEnv(config: Record<string, unknown>): EnvConfig {
  const result = envSchema.safeParse(config);

  if (!result.success) {
    const errors = result.error.issues
      .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');
    throw new Error(`\n❌ Environment validation failed:\n${errors}\n\nCheck your .env file.`);
  }

  return result.data;
}
