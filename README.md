# 🍽️ Restaurant OS — AI-Powered Dining & Management Platform

A high-performance, real-time Restaurant Operating System featuring **Contactless QR Table Dining**, a 4-stage **Kitchen Display System (KDS)** with live kanban and audio alerts, an **AI Menu OCR Importer**, and an **Executive Management Console** with high-precision financial calculations (`decimal.js`).

---

## ⚡ Active Services & Running Ports

| Service | Port | Local URL | Description |
| :--- | :--- | :--- | :--- |
| **Frontend Web App** | `3000` | [http://localhost:3000](http://localhost:3000) | Next.js 14 Web Application |
| **Backend REST API** | `3001` | [http://localhost:3001/api](http://localhost:3001/api) | NestJS 10 REST & OCR Engine |
| **API Documentation** | `3001` | [http://localhost:3001/api/docs](http://localhost:3001/api/docs) | Swagger / OpenAPI Explorer |
| **Database (PostgreSQL)**| `5433` | `localhost:5433` | PostgreSQL 18 with relational schema |

---

## 🧭 Direct Portal Navigation Links

Once the servers are running, access each portal directly:

- **🏠 Home Portal:** [http://localhost:3000](http://localhost:3000)
- **📱 Guest QR Dining (Table 1):** [http://localhost:3000/t/qr-spice-t1-indiranagar-token-001](http://localhost:3000/t/qr-spice-t1-indiranagar-token-001)
- **👨‍🍳 Kitchen Display System (KDS):** [http://localhost:3000/kds](http://localhost:3000/kds)
- **📊 Manager Dashboard:** [http://localhost:3000/dashboard](http://localhost:3000/dashboard)
- **🔐 Staff Login:** [http://localhost:3000/login](http://localhost:3000/login)
- **🩺 API Health Check:** [http://localhost:3001/api/health](http://localhost:3001/api/health)

---

## 🛠️ Prerequisites

Ensure the following tools are installed on your machine:
- **Node.js**: `v20.x` or `v22.x` / `v24.x`
- **pnpm**: `v9.x` (`npm install -g pnpm`)
- **PostgreSQL**: Version 15+ (Preconfigured on port `5433` in this project)

---

## 🚀 Step-by-Step Setup & Run Commands

Run all commands from the repository root (`d:\Projects\Restaurents`):

### 1. Install Workspace Dependencies
```powershell
pnpm install
```

---

### 2. Configure Environment Variables

Create or verify the `.env` file in `apps/api/.env`:
```env
PORT=3001
NODE_ENV=development
DATABASE_URL="postgresql://postgres:postgres@localhost:5433/restaurant_os?schema=public"
JWT_SECRET="spice-symphony-super-secret-jwt-key-2026"
CORS_ORIGIN="http://localhost:3000"
```

And in `apps/web/.env.local`:
```env
NEXT_PUBLIC_API_URL="http://localhost:3001/api"
```

---

### 3. Start PostgreSQL Database (Port 5433)

If you are using the local infrastructure cluster:

**Windows PowerShell:**
```powershell
& "C:\Program Files\PostgreSQL\18\bin\postgres.exe" -D "d:\Projects\Restaurents\infrastructure\pgdata" -p 5433
```

*(Leave this running in its own terminal or service window)*

---

### 4. Initialize Database Schema & Seed Data

Run Prisma migrations and populate the database with demonstration menu items, tables, and credentials:

```powershell
# Generate Prisma Client
pnpm --filter @restaurant-os/api prisma:generate

# Push migrations to the database
pnpm --filter @restaurant-os/api prisma:migrate

# Seed with authentic Indian cuisine menu and demo restaurant
pnpm --filter @restaurant-os/api seed
```

---

### 5. Start Backend API (Port 3001)

You can run the API in either production or development mode:

**Option A: Fast Production Mode**
```powershell
# Build the API
pnpm --filter @restaurant-os/api build

# Launch the API
node apps/api/dist/src/main.js
```

**Option B: Development Mode (with hot-reload)**
```powershell
pnpm --filter @restaurant-os/api start:dev
```

*The API will be available at `http://localhost:3001/api`.*

---

### 6. Start Frontend Web App (Port 3000)

Open a new terminal window:

**Option A: Fast Production Mode (Recommended)**
```powershell
# Build Next.js bundle with Tailwind CSS
pnpm --filter @restaurant-os/web build

# Start production server
pnpm --filter @restaurant-os/web start -p 3000
```

**Option B: Development Mode**
```powershell
pnpm --filter @restaurant-os/web dev -p 3000
```

*The Web App will be available at `http://localhost:3000`.*

---

## 🔑 Demo Credentials

| Role | Email | Password |
| :--- | :--- | :--- |
| **Owner / Manager** | `owner@spicesymphony.in` | `Password123!` |
| **Chef / Kitchen** | `chef@spicesymphony.in` | `Password123!` |
| **Staff / Cashier** | `staff@spicesymphony.in` | `Password123!` |

*(Guest QR dining requires no login — simply scan or visit the table URL).*

---

## 🔄 Real-Time Cross-Tab Synchronization

The platform utilizes a zero-latency `SyncBus` built on browser `BroadcastChannel` and `localStorage` fallback:
1. Open **Guest QR Dining** on one window: `http://localhost:3000/t/qr-spice-t1-indiranagar-token-001`
2. Open **Kitchen KDS** on a second window: `http://localhost:3000/kds`
3. Open **Manager Dashboard** on a third window: `http://localhost:3000/dashboard`
4. Add items to cart and press **"Fire Order to Kitchen"**:
   - The KDS immediately sounds an alert chime, flashes an alert banner, and places the ticket under **"NEW"**.
   - The Manager Dashboard live metrics increase and Table 1 turns **ACTIVE (Occupied)**.
   - Calling a Waiter or Requesting the Bill triggers instant badges across both staff screens.

---

## 📁 Repository Structure

```
d:\Projects\Restaurents
├── apps/
│   ├── api/                     # NestJS 10 REST API, OCR, Prisma Service (Port 3001)
│   │   ├── src/
│   │   │   ├── modules/         # Auth, Orders, Menu, Tables, OCR, Billing
│   │   │   └── common/          # Pipes, Decimal utilities, Guards
│   │   └── prisma/              # Prisma schema, migrations & seed scripts
│   └── web/                     # Next.js 14 App Router, Tailwind CSS (Port 3000)
│       └── src/app/
│           ├── page.tsx         # Home Showcase
│           ├── t/[token]/       # Guest Table Dining Page
│           ├── kds/             # Kitchen Kanban Board
│           ├── dashboard/       # Management & Reports Console
│           └── login/           # Staff Authentication
├── packages/
│   ├── types/                   # Shared TypeScript interfaces & DTOs
│   └── validation/              # Zod validation schemas
├── infrastructure/
│   └── pgdata/                  # Local PostgreSQL data directory
└── README.md                    # Project Documentation & Run Commands
```
