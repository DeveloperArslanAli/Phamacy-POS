# Remaining Module Implementation Plan

## Purpose
This plan defines the remaining backend module work needed to complete the Pharmacy POS API before implementation begins. It focuses on the modules and workflows that still require design, development, and validation.

## Priority Goals
1. Complete the core pharmacy workflows required for a functional POS: prescriptions, checkout, sales, catalog lookup, refunds, and inventory.
2. Harden authorization, licensing, and audit mechanics across all remaining modules.
3. Ensure outbox sync, offline tolerance, and desktop integration are supported by the backend contract.
4. Establish a testable implementation sequence with clear acceptance criteria.

## Implementation Order
1. Auth / RBAC review and guard coverage
2. Prescriptions module
3. Checkout / sales module
4. Catalog search module
5. Refund module
6. Inventory and stock movement support
7. License / device enforcement
8. Sync / audit outbox processing
9. Desktop API contract and integration

## Remaining Module Breakdown

### 1. Auth / RBAC Review
Objective: Ensure endpoint protection is complete, and role checks align with pharmacy workflows.

Tasks:
- Audit all controller routes and apply `JwtAuthGuard` where missing.
- Confirm `RolesGuard` and `@Roles()` are used for sensitive operations.
- Define exact role mappings for `admin`, `staff`, `pharmacist`, `cashier`, and `manager`.
- Add support for role-aware request context if not already available.
- Verify that auth tokens are issued with tenant and role claims.

Acceptance:
- Every write endpoint requires authentication.
- Sensitive endpoints require explicit role membership.
- Login returns a valid JWT with correct claims.

### 2. Prescriptions Module
Objective: Complete prescription lifecycle operations for intake, verification, dispense, pickup, reversal, and history.

Tasks:
- Extend `PrescriptionsService` with actions for `verifyPrescription`, `dispensePrescription`, `pickupPrescription`, and `reversePrescription`.
- Add state transitions and validation for prescription status changes.
- Implement patient and prescriber relationship queries.
- Add lifecycle audit events for each state change.
- Preserve `PrescriptionLine` item details and support partial fills.

Dependencies:
- License validation from `LicenseService`.
- User role checks for pharmacist and technician actions.
- Audit event creation.

Acceptance:
- Prescription creation writes a valid record and lines.
- Verification/dispense/pickup/reversal are available with status validation.
- Invalid state changes are rejected.
- Audit trail exists for each prescription action.

### 3. Checkout / Sales Module
Objective: Build a production-ready checkout pipeline that creates sales, payment records, and handles totals validation.

Tasks:
- Replace the current `SaleService.createSale` with a transactional checkout path if it remains necessary.
- Add stock reservation and deduction support for checkout.
- Support line-level pricing, tax, discounts, and returnable sale line metadata.
- Create payments and ensure tender amount matches sale totals.
- Add sale metadata for cashier, location, and receipt reference.
- Extend `SaleController` / `CheckoutController` with a more complete checkout flow.

Dependencies:
- Inventory stock levels
- License enforcement
- Audit and outbox event creation

Acceptance:
- Checkout finalization writes `Sale`, `SaleLine`, and `Payment` in one transaction.
- Total validation rejects mismatched payments.
- License enforcement prevents checkout without active entitlement.
- Sale list query returns line and payment detail.

### 4. Catalog Search Module
Objective: Provide real product lookup by SKU, barcode, and name to support register and prescription flows.

Tasks:
- Ensure `CatalogService.searchItems` performs DB queries for `Item` and `ItemVariant`.
- Add optional filters for item type, availability, and tenant scope.
- Consider a dedicated `barcode` search endpoint if required.
- Return enough product metadata for the desktop UI to construct a sale line.

Acceptance:
- Search endpoint returns correct items for SKU, name, and barcode queries.
- Empty query returns a safe set of recent or available items.

### 5. Refund Module
Objective: Support refund request and approval workflow with audit support.

Tasks:
- Add refund approval metadata and audit logging.
- Enforce `admin` or `manager` role for approval actions.
- Optionally link refund approvals to original sale and inventory restock logic.
- Add query filters and refund status transitions.

Acceptance:
- Refunds can be created in a pending state.
- Approval routes update refund status and create an audit record.
- Unauthorized roles cannot approve refunds.

### 6. Inventory / Stock Support
Objective: Build the inventory ledger and ensure sales/returns can reconcile stock correctly.

Tasks:
- Add stock decrement logic for sale completion.
- Implement basic `InventoryMovement` records for sale and refund events.
- Ensure `InventoryBalance` updates on checkout/return.
- Add `item` and `batchLot` data where needed for FEFO logic later.

Dependencies:
- Sale and refund workflows
- Audit trail
- Batch lot tracking for later phases

Acceptance:
- Sales reduce available stock in the inventory balance model.
- Inventory movement records exist for transaction events.
- Stock operations are transactionally consistent.

### 7. License / Device Enforcement
Objective: Make authorization, offline grace, and device registration part of the core app contract.

Tasks:
- Confirm license validation is invoked in prescriptions and checkout.
- Add device registration and last-seen tracking.
- Build any necessary status endpoint for desktop to verify entitlement.
- Document license check behavior for offline and fallback conditions.

Acceptance:
- Active license requirement is enforced for prescription intake and checkout.
- Device registry routes create and list device bindings.
- A tenant license validation endpoint returns current status.

### 8. Sync / Audit Outbox Processing
Objective: Ensure events are captured for downstream sync and audit workflows.

Tasks:
- Keep `SyncOutbox` writes in every important transactional path.
- Add an audit event for every prescription, sale, refund, and license action.
- Implement a worker or controller path for processing outbox events if needed.
- Ensure outbox status and processed timestamps are maintained.

Acceptance:
- Important domain actions create both audit and outbox records.
- Outbox events can be listed and marked as processed.
- The system is ready for future offline sync or integration workers.

### 9. Desktop API Contract
Objective: Define the backend APIs the Electron frontend needs to complete the remaining POS workflows.

Tasks:
- Confirm endpoint contracts for login, item search, prescription create/list, checkout, refund request, device registration, and license validation.
- Document request/response shapes for the desktop integration.
- Add any missing DTO schema validation and response serialization where needed.

Acceptance:
- Desktop can authenticate and call protected endpoints consistently.
- API contracts are stable enough to begin UI wiring.

## Cross-Cutting Concerns
- Validation: use DTOs and `ValidationPipe` for all incoming requests.
- Error handling: return meaningful HTTP errors for invalid workflow transitions.
- Transactional consistency: use Prisma transactions when multiple related writes occur.
- Testing: add unit tests for business rules and integration tests for key flows.
- Documentation: keep `docs/project-continuity-handoff.md` and new API contract notes up to date.

## Milestones
1. Auth audit + role coverage
2. Prescription lifecycle implementation
3. Checkout and sale transaction completion
4. Catalog and refund support
5. Inventory stock update and movement logging
6. License/device enforcement and sync readiness
7. Desktop contract documentation and initial UI wiring

## Delivery Checklist
- [ ] All controllers protected by `JwtAuthGuard`
- [ ] Sensitive routes guarded by `RolesGuard`
- [ ] Prescription creation + lifecycle actions implemented
- [ ] Checkout flow writes sale, lines, payments, audit, and outbox
- [ ] Catalog search is DB-driven and tenant-scoped
- [ ] Refund workflow supports request/approve with audit
- [ ] Stock balances update transactionally on sale/refund
- [ ] License validation is enforced in core flows
- [ ] Sync outbox event pipeline is present for all major transactions
- [ ] Desktop API contract is documented and stable

## Implementation Notes
- Keep each module self-contained and expose only required services.
- Prefer `tenantId` scoping on all queries and writes.
- Use audit events for every state-changing action.
- Avoid direct DB access from frontend; use controller DTOs.
- Build incrementally and verify each module with a small integration test.
