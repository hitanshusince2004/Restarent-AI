# AI-Powered Restaurant Operating System (Restaurant OS)

Production-grade, multi-tenant SaaS platform empowering modern restaurants with:
- **Instant QR Digital Dining**: Contactless ordering, live table sessions, running bills.
- **AI Menu Importer**: OCR-based layout and menu extraction from physical menu photos using local Tesseract WASM.
- **Live Kitchen Display System (KDS)**: 4-stage kanban workflow synchronized via WebSockets.
- **Enterprise Multi-Tenancy**: Complete tenant isolation, granular RBAC (Owner, Manager, Staff, Kitchen, Cashier).
- **Audit Logging & Decimal Financial Engine**: Immutable event logs, zero floating-point arithmetic errors for INR pricing and GST calculations.

---

## Architecture Overview

```
[ Customer Mobile / PWA ]       [ Kitchen Display ]      [ Restaurant Dashboard ]
            \                           |                          /
             \                          |                         /
              \                         |                        /
               ▼                        ▼                       ▼
            +------------------------------------------------------+
            |               Next.js 14 Web Application             |
            +------------------------------------------------------+
                                        |  REST + WebSockets
                                        ▼
            +------------------------------------------------------+
            |               NestJS 10 API Modular Monolith         |
            +------------------------------------------------------+
             |            |            |              |          |
             ▼            ▼            ▼              ▼          ▼
       [ PostgreSQL ]  [ Redis ]   [ MinIO S3 ]   [ Socket.IO ] [ Tesseract OCR ]
        Prisma ORM     BullMQ/Cache Local Storage  Room Scoped   Local WASM engine
```

---

## Quick Start (Local Development)

### 1. Prerequisites
- **Node.js**: >= 20.0.0
- **pnpm**: >= 9.0.0
- **Docker & Docker Compose**

### 2. Infrastructure Setup
Start PostgreSQL 16, Redis 7, and MinIO locally:
```bash
docker compose -f infrastructure/docker/docker-compose.yml up -d
```

### 3. Environment Variables
```bash
cp .env.example .env
cp .env.example apps/api/.env
```

### 4. Install Dependencies & Build Packages
```bash
pnpm install
pnpm --filter @restaurant-os/types build
pnpm --filter @restaurant-os/validation build
pnpm --filter @restaurant-os/config build
```

### 5. Database Migrations & Deterministic Seed
```bash
pnpm --filter @restaurant-os/api prisma:generate
pnpm --filter @restaurant-os/api prisma:migrate
pnpm --filter @restaurant-os/api prisma:seed
```

### 6. Run Backend & Frontend
```bash
# In separate terminals or using Turbo:
pnpm --filter @restaurant-os/api dev
pnpm --filter @restaurant-os/web dev
```

---

## Seed Accounts & Access Credentials

- **Owner Dashboard**: `owner@spicesymphony.in` / `Password123!`
- **Sample Restaurant Slug**: `the-spice-symphony`
- **Sample Table 1 QR Link**: `http://localhost:3000/t/qr-spice-t1-indiranagar-token-001`
- **Swagger API Documentation**: `http://localhost:3001/api/docs`
- **API Health Endpoint**: `http://localhost:3001/api/v1/health`
- **MinIO Console**: `http://localhost:9001` (`minioadmin` / `minioadmin123`)
