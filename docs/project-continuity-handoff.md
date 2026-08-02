# Project Continuity Handoff

## Project Context

### Product
HMAT Pharmacy POS is a desktop-first pharmacy point-of-sale platform built with NestJS backend, PostgreSQL persistence, Prisma ORM, and Electron desktop UI. It supports pharmacy workflows including inventory, prescriptions, sales, and tenant management.

### Architecture
- Backend: `apps/api` with NestJS modules for auth, inventory, sales, prescriptions, checkout, catalog, tenant, health.
- Database: PostgreSQL via Prisma schema in `apps/api/prisma/schema.prisma`.
- Desktop: `apps/desktop` Electron renderer connecting to the API.
- Environment: `.env` in `apps/api` controls database URL and port.

### Key Files
- `docs/pharmacy-pos-architecture-plan.md` - feature plan, requirements, and domain model.
- `docs/database-api-integration.md` - database and API integration summary.
- `apps/api/prisma/schema.prisma` - data model, entities, relationships, indexes.
- `apps/api/src/auth/*` - real auth service, JWT strategy, guards, roles.
- `apps/api/src/prisma/prisma.service.ts` - Prisma lifecycle and connection handling.
- `apps/api/src/inventory/*`, `apps/api/src/sale/*`, `apps/api/src/tenant/*` - current live endpoints.
- `apps/api/src/prescriptions/*`, `apps/api/src/checkout/*`, `apps/api/src/catalog/*` - currently placeholder, must be completed.

## Current Status

### Completed
- PostgreSQL database created and synced with Prisma schema.
- Seed data loaded for tenants, locations, users, patients, items, batch lots, inventory balances, prescriptions, sales, payments.
- Backend compile succeeds with `npm run build` in `apps/api`.
- Auth module installed and configured for JWT + Passport.
- Inventory and sales endpoints working with real data.
- Tenant management endpoint ready.
- License, device, refund, audit, and sync modules are now implemented and wired into the application.
- Prescription creation now enforces active tenant license validation, creates audit events, and writes sync outbox events.
- Prescription status update is implemented with state transition validation, audit trail, and sync outbox emission.
- Checkout finalization now validates totals, enforces tenant license status, verifies item existence, allocates inventory in FEFO order, writes inventory movement records, and creates audit/outbox events.
- Catalog search now performs real database queries against `Item` and `ItemVariant`.

### In Progress
- Auth: JWT login flow is in place, but controller and guards still need review for full protection across every route.
- Prescriptions: further workflow actions for verify, dispense, pickup, reverse, and pharmacist approval remain pending.
- Checkout: core transaction finalization is implemented, but receipt generation, split tender, offline retry, and sale reconciliation are not complete.
- Catalog: DB search works, but UX-level filters and barcode scanning integration remain to be added.
- Desktop: Electron renderer shell exists, but real API integration, auth flow, and checkout workflow are not fully wired.

### Blockers
- Some controllers are not fully protected by auth guards yet.
- The desktop app still depends on backend placeholders for full POS flow.
- The production-ready RBAC and sensitive-action approvals are not implemented.

## Feature and Schema Context

### Live Feature Coverage
- Tenant management
- Inventory item listing
- Sales listing
- Auth login infrastructure

### Pending Core Features
- Prescription lifecycle actions beyond creation (verify, dispense, pickup, reverse)
- Checkout enhancements: cash/card split tender, receipts, refunds, and real stock deduction.
- Catalog search UX improvements plus barcode/SKU scanning.
- Inventory batch/lot FEFO and expiry logic with location-level consumption.
- Real-time stock reservation, hold, and rollback for tentative sales.
- Role-based access control for sensitive actions and approval workflows.

### Database Entities (Current Prisma Schema)
- Tenant
- Location
- User
- Patient
- Item
- ItemVariant
- BatchLot
- InventoryBalance
- InventoryMovement
- Prescription
- PrescriptionLine
- Sale
- SaleLine
- Payment
- AuditEvent

### Schema Notes
- `User` stores `email`, `passwordHash`, `displayName`, `role`, `status`.
- `Item` includes `sku`, `type`, `taxCode`, `reorderPoint`.
- `BatchLot` tracks `batchNo`, `expiryDate`, `cost`.
- `InventoryBalance` is location+item+batchLot unique.
- `Sale` and `SaleLine` model completed POS transactions.
- `Payment` is tender record for each sale.

## RBAC and Security Context

### Implemented RBAC Components
- JWT auth strategy in `apps/api/src/auth/jwt.strategy.ts`.
- `JwtAuthGuard` for bearer token enforcement.
- `RolesGuard` and `Roles` decorator for route-level role checks.
- Auth module exports guards for reuse.

### Role Model Expected
- `admin`
- `staff`
- `pharmacist`
- `cashier`
- `manager`

### Required RBAC Improvements
- Map seeded user roles to actual permissions.
- Protect prescription creation, verification, dispense, and reversal.
- Protect inventory adjustments, batch alterations, and sales refunds.
- Support step-up approval for controlled substance or price override actions.
- Implement `Permission`/`Role` metadata and policy evaluation in the backend.

## Plan Status and Staging

### Phase Status
- Phase 1: Auth and basic API wiring — started, compile success, partial auth present.
- Phase 2: Core pharmacy workflows — seeded data exists, but prescription and checkout logic pending.
- Phase 3: POS checkout flow — placeholder currently; requires full transaction pipeline.
- Phase 4: Validation and error handling — not started in earnest.
- Phase 5: Security hardening — partially started via JWT, remaining work on RBAC and sensitive actions.
- Phase 6: Desktop integration — pending.
- Phase 7: Observability and deployment — pending.

### Draft vs Staging
- `apps/api/src/auth` and `apps/api/src/inventory` are in staging-ready shape.
- `apps/api/src/sale` is in staging-ready shape for read/list operations.
- `apps/api/src/prescriptions`, `apps/api/src/checkout`, `apps/api/src/catalog` are draft placeholders.
- Database schema is staged and seeded, but transaction workflows are draft.
- Desktop integration is draft / early stage.

## Next Recommended Milestones

1. Secure all API controllers with `JwtAuthGuard` and route-level roles.
2. Replace prescriptions placeholder data with actual Prisma queries and relational output.
3. Implement checkout flow with sale line creation, payment creation, stock adjustment, and audit events.
4. Replace catalog search placeholder with item/barcode database search.
5. Add unit tests for auth login, inventory listing, prescriptions listing, sales creation.
6. Wire Electron desktop login and checkout screens to the real API.
7. Add environment variable documentation and production `.env` checklist.

## Continuity Handoff Notes

### What to keep in mind
- Always run `npm install` from workspace root before building or starting the API.
- The API build now uses `tsc -p tsconfig.json` in `apps/api`.
- Prisma seed logic is not part of API compile; use `npx prisma db seed` or `npm run prisma:generate` as needed.
- The database is seeded with production-like example data, but the application workflows are not all wired yet.

### Recommended handoff path
- Continue from `apps/api/src/prescriptions/prescriptions.controller.ts` and `apps/api/src/checkout/checkout.controller.ts` first.
- Then complete `apps/api/src/catalog/catalog.controller.ts` and ensure search uses `item` and `variant` tables.
- Finally, connect `apps/desktop/renderer` to authenticated endpoints for login and cart flow.

### Reference files
- `docs/pharmacy-pos-architecture-plan.md`
- `docs/database-api-integration.md`
- `apps/api/prisma/schema.prisma`
- `apps/api/src/auth/*.ts`
- `apps/api/src/prescriptions/*.ts`
- `apps/api/src/checkout/*.ts`
- `apps/api/src/catalog/*.ts`
- `apps/api/src/inventory/*.ts`
- `apps/api/src/sale/*.ts`

## Handoff Summary

The current project state is a working NestJS API with database persistence, JWT auth infrastructure, and seeded pharmacy data. The remaining production-readiness work is mostly in completing workflow controllers, RBAC enforcement, and real desktop integration.
