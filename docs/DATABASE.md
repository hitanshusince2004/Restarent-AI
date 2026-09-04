# Database Schema Reference

## Overview
- **Engine**: PostgreSQL 16
- **ORM**: Prisma 5
- **Primary Keys**: CUID / UUID strings
- **Monetary Storage**: `Decimal(12, 4)`

---

## Entity Relationship Summary

### Core Hierarchy
- `Restaurant`: Top-level tenant root.
- `Outlet`: Physical locations / branches belonging to a restaurant.
- `Floor`: Dining zones within an outlet.
- `Table`: Physical table entities with assigned capacities and spatial coordinates.
- `TableQrCode`: Cryptographically random tokens (`token`) linked to a table. Revocable without mutating table definitions.

### Menu Domain
- `MenuCategory`: Top-level categories with display ordering.
- `MenuItem`: Base menu item with price, tax rate, and food type (`VEG`, `NON_VEG`, etc.). Soft-deleted (`deletedAt`) to preserve historical order integrity.
- `MenuItemVariant`: Portions or style variants with discrete pricing.
- `ModifierGroup`: Grouping of modifiers (e.g., "Spice Level", "Add-ons") with selection rules (`SINGLE`, `MULTIPLE`, `minSelections`, `maxSelections`).
- `ModifierOption`: Specific add-ons with additional price points.

### Dining & Order Domain
- `TableSession`: Represents a single dining engagement at a table (`OPEN` -> `ACTIVE` -> `BILLING` -> `PAID` -> `CLOSED`). Enforces single active session per table.
- `Order`: Order submitted from a customer or staff cart. Features price snapshots and state tracking.
- `OrderItem`: Line items preserving the unit price, tax rate, and computed line grand total at order submission.
- `OrderItemModifier`: Snapshot of chosen modifiers and additional costs.
- `OrderEvent`: Append-only audit trail recording every state transition.

### Kitchen & Billing
- `KitchenTicket`: Real-time order representation in the kitchen workflow (`NEW` -> `ACKNOWLEDGED` -> `PREPARING` -> `READY` -> `COMPLETED`).
- `Bill`: Financial summary bound 1-to-1 to a table session. Accumulates order totals, discounts, taxes, and payments.
- `Payment`: Recorded payment transaction with idempotency key, method (`CASH`, `UPI`, `CARD`), and staff attribution.

### Platform & Security
- `User`: Platform user accounts.
- `Role` & `Permission`: RBAC mapping. System roles (`OWNER`, `MANAGER`, `STAFF`, `KITCHEN`, `CASHIER`) and extensible custom roles.
- `RestaurantUser`: Many-to-many relationship scoping a user's role to a specific restaurant.
- `AuditLog`: Append-only immutable log for all critical state changes.
