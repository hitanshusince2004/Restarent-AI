export const APP_CONFIG = {
  NAME: 'Restaurant OS',
  VERSION: '1.0.0',
  DEFAULT_CURRENCY: 'INR',
  DEFAULT_TAX_RATE: 5.0,
  SUPPORTED_GST_SLABS: [0, 5, 12, 18, 28],
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
  ORDER_NUMBER_PREFIX: 'ORD',
  IDEMPOTENCY_HEADER: 'x-idempotency-key',
  REQUEST_ID_HEADER: 'x-request-id',
  AUTH_COOKIE_NAME: 'restaurant_os_refresh_token',
  WS_NAMESPACE: '/events',
} as const;

export const SOCKET_ROOMS = {
  restaurant: (restaurantId: string) => `restaurant:${restaurantId}`,
  outlet: (outletId: string) => `outlet:${outletId}`,
  kitchen: (outletId: string) => `kitchen:${outletId}`,
  session: (sessionId: string) => `session:${sessionId}`,
} as const;
