# System Architecture

## 1. Modular Monolith Design
Restaurant OS is designed as a **modular monolith** with clean bounded contexts. This guarantees:
- High developer velocity and single-command local development.
- Clear transactional integrity across Orders, Bills, and Table Sessions.
- Seamless future extractability into microservices if scaling requirements demand.

## 2. Multi-Tenant Isolation Strategy
- Multi-tenancy is enforced at the database layer with `restaurantId` on every tenant-owned resource.
- **Tenant Context**: Determined strictly from the authenticated JWT session or verified table session token. The backend never blindly trusts tenant IDs provided in client payloads.
- **WebSocket Room Scoping**:
  - `restaurant:{restaurantId}`: Restricts dashboard events to authorized staff of that restaurant.
  - `kitchen:{outletId}`: Restricts order tickets to the designated outlet kitchen.
  - `session:{tableSessionId}`: Isolates table order and bill updates to clients seated at that specific table session.

## 3. Financial Engine & Decimal Safety
- Standard JavaScript numbers (`IEEE 754 floating point`) are strictly forbidden for currency.
- All monetary arithmetic uses `decimal.js` on the server and `Decimal(12, 4)` in PostgreSQL.
- Cart totals sent from clients are completely ignored; the server re-queries current menu item prices, computes line item taxes, sums modifiers, and applies rounding adjustments.

## 4. Price Immutability & Snapshots
- When an order is placed, an `OrderItem` snapshot is created storing:
  - `itemName`
  - `variantName`
  - `unitPrice`
  - `taxRate`
  - `lineTotal`, `lineTax`, `lineGrandTotal`
  - `OrderItemModifier` prices
- Subsequent updates to restaurant menu prices do not affect historical orders or existing bills.

## 5. State Machines
State machine transitions are strictly enforced in the service layer:
- **Order State Machine**:
  `PENDING` -> `ACCEPTED` -> `PREPARING` -> `READY` -> `SERVED` -> `COMPLETED`
  (Cancellation permitted only from `PENDING`, `ACCEPTED`, or `PREPARING`).
- **Kitchen Ticket State Machine**:
  `NEW` -> `ACKNOWLEDGED` -> `PREPARING` -> `READY` -> `COMPLETED`
- **Table Session State Machine**:
  `OPEN` -> `ACTIVE` -> `BILLING` -> `PAID` -> `CLOSED`
