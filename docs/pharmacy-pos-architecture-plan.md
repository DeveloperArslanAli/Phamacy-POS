# Pharmacy POS Platform Plan

## 1. Product Goal
Build a production-ready pharmacy point-of-sale platform optimized for speed at the counter, safe medication workflows, strong auditability, and enterprise deployment. The system should support both retail checkout and pharmacy-specific operations such as prescription handling, batch/lot tracking, FEFO dispensing, controlled substance controls, returns, reporting, and directory-based access control.

## 2. Product Principles
- Counter-first workflow: scan, search, dispense, and tender with minimal clicks.
- Safety before convenience: prevent accidental sale, dispense, override, or inventory mutation without traceability.
- Offline-tolerant desktop: the register must continue to function during network issues.
- Enterprise-ready: identity federation, policy controls, licensing, audit, observability, and supportability are first-class.
- Low training burden: obvious layouts, keyboard-driven flows, and minimal modal interruptions.

## 3. Scope Definition
### Minimal Best Version
The MVP should include:
- POS checkout for OTC and prescription-associated sales
- Prescription intake, validation, fulfillment, pickup, and reversal
- Inventory with batch, lot, expiry, FEFO, reorder points, transfers, and cycle counts
- Customer/patient profiles and dispensing history
- Refunds, voids, discounts, coupons, and supervisor overrides
- Controlled substance logs and audit trails
- Role-based access control
- Directory login and license activation
- Offline local cache and sync engine
- Reporting for sales, inventory, expiry, shrink, cash reconciliation, and user activity
- Desktop shell with printer/scanner/cash drawer support

### Phase 2 / Expansion
- Insurance adjudication integrations
- Third-party eRx integrations
- Multi-store centralized warehouse allocation
- Loyalty, promotions, CRM, and recall automation
- Accounting/ERP integration
- Advanced analytics and forecasting
- Self-service pickup, patient portal, and messaging

## 4. Functional Requirements
### 4.1 Checkout and Sales
- Support fast item scan, SKU search, barcode lookup, and generic product lookup.
- Support mixed baskets containing OTC items, prescription items, and service fees.
- Support cash, card, split tender, store credit, coupons, and manual payment adjustments.
- Support receipt reprint, sale void, partial void, and line-level notes.
- Support end-of-shift cash drawer reconciliation and cashier closing.
- Enforce idempotent sale submission so printer/network retries do not duplicate transactions.

### 4.2 Prescription Workflow
- Create or import prescription records.
- Store patient, prescriber, medication, dosage, quantity, refill, and instructions.
- Track prescription status: received, pending verification, verified, dispensed, partially dispensed, picked up, reversed, cancelled.
- Support pharmacist verification and supervisor override flows.
- Track counseling notes, allergy warnings, interaction warnings, and substitution notes.
- Support partial fill and refill history.
- Support patient pickup linkage and signature capture where required.

### 4.3 Inventory and Procurement
- Maintain item master with SKU, NDC or local code, supplier, brand/generic mapping, unit of measure, tax class, and shelf location.
- Track inventory by warehouse/store, bin, batch, lot, and expiry date.
- Enforce FEFO selection for dispense and sale.
- Support purchase orders, goods receipt, supplier return, stock adjustments, transfers, shrink, and write-off.
- Support low-stock alerts, expiry alerts, and dead-stock alerts.
- Support controlled substance inventory registers separate from general stock.
- Support cycle counts and audit variance capture.

### 4.4 Customer and Patient Management
- Maintain patient profiles with demographics, contact data, allergy flags, notes, and history.
- Support household/family grouping and dependent profiles.
- Maintain dispensing history and purchase history.
- Support consent flags and communication preferences.

### 4.5 Returns, Refunds, and Exceptions
- Support reason-coded returns and refunds.
- Require approval rules for sensitive actions such as controlled items, price overrides, and large discounts.
- Record every reversal with original transaction linkage.
- Distinguish sale reversal from inventory restock, quarantine, or discard.

### 4.6 Reporting and Audit
- Daily sales, margin, payment, cashier, and shift reports.
- Inventory valuation, expiry exposure, stock aging, shrink, and transfer reports.
- Prescription fulfillment, refill, and counseling reports.
- Controlled substance and audit reports.
- License, login, override, and configuration change logs.
- Exportable reports for external auditors and management.

### 4.7 Administration
- Store configuration, tax rules, printer setup, payment terminal setup, and device health.
- User and role administration.
- License activation and renewal management.
- Integration configuration for directory, payments, and external systems.

## 5. Non-Functional Requirements
### Performance
- Scan-to-line-add under 200 ms locally.
- Search response under 500 ms for common indexed lookups.
- Checkout submission under 2 seconds on normal network conditions.
- Startup to usable register state under 10 seconds on standard hardware.

### Availability and Resilience
- Desktop app must continue in degraded offline mode when the backend is unavailable.
- Sync should recover automatically once connectivity returns.
- Critical operations must be retry-safe and idempotent.
- Audit data must be durable and tamper-evident.

### Security and Compliance
- Encrypt data in transit and at rest.
- Support least-privilege access and step-up approval for sensitive actions.
- Protect ePHI with administrative, physical, and technical safeguards.
- Separate payment data handling from the core operational domain where possible.
- Maintain immutable audit trails for regulated actions.
- Support incident response, security logging, and forensic export.

### Maintainability
- Strong module boundaries and domain-driven service design.
- Event-driven architecture for inventory and financial side effects.
- Clear contracts for sync, licensing, and integrations.
- Automated tests for business rules, permissions, and edge cases.

### Usability
- Keyboard-first navigation.
- Large touch targets for tablet terminals.
- High-contrast, low-clutter interfaces.
- Minimal interruption from dialogs and confirmations.
- Clear language suitable for non-technical pharmacy staff.

## 6. Database Matrix
### Core Data Model
| Entity | Purpose | Key Fields | Notes |
|---|---|---|---|
| Tenant | Pharmacy organization boundary | id, name, status, timezone, locale | Top-level isolation |
| Location | Store or branch | id, tenantId, code, name, address | Supports multi-store |
| User | Application identity | id, tenantId, email, status, directorySubjectId | Maps to directory login |
| Role | Authorization role | id, tenantId, code, name | Can be directory-mapped |
| Permission | Atomic capability | id, code, description | Used for policy checks |
| UserRole | Role assignment | userId, roleId, scopeType, scopeId | Supports location-scoped roles |
| Patient | Patient/customer profile | id, tenantId, mrn, name, phone, allergies, consentFlags | May differ from retail customer |
| Prescriber | Doctor/clinic identity | id, tenantId, name, registrationNo, contact | Optional external integration |
| Prescription | Dispensing order | id, tenantId, patientId, prescriberId, status, rxNo, issuedAt | Workflow state machine |
| PrescriptionLine | Medication line | id, prescriptionId, itemId, qty, dosage, directions | Tracks substitutions/refills |
| Item | Sellable/dispensable product | id, tenantId, sku, name, type, taxCode, reorderPoint | Canonical product record |
| ItemVariant | Unit/pack variant | id, itemId, unitSize, barcode, uom | Supports strip/bottle/case |
| BatchLot | Inventory lot | id, itemId, batchNo, expiryDate, cost, supplierId | FEFO and recall support |
| InventoryBalance | Current stock by location and lot | id, locationId, itemId, batchLotId, onHand, reserved, quarantined | Read model for speed |
| InventoryMovement | Stock movement ledger | id, movementType, referenceType, referenceId, qty, fromLocationId, toLocationId | Source of truth |
| StockCount | Cycle count session | id, locationId, status, startedBy, completedAt | Variance audit |
| Supplier | Vendor | id, tenantId, name, contact, terms | Procurement |
| PurchaseOrder | Replenishment order | id, tenantId, supplierId, status, total | Procurement workflow |
| Sale | POS transaction | id, tenantId, locationId, cashierId, status, totals, tenderedAt | Financial source record |
| SaleLine | Transaction line | id, saleId, itemId, qty, unitPrice, discount, tax | References lots if needed |
| Payment | Tender record | id, saleId, method, amount, providerRef, status | Split tender supported |
| Refund | Reversal record | id, saleId, reasonCode, amount, approvedBy | Links to source sale |
| CashDrawerSession | Shift control | id, locationId, openedBy, closedBy, openingFloat, closingCount | End-of-day control |
| AuditEvent | Immutable audit trail | id, actorId, action, entityType, entityId, before, after, ipAddress | Tamper-evident storage |
| License | Tenant entitlement | id, tenantId, status, expiresAt, planCode, offlineGraceUntil | VPLA-like activation |
| Device | Register or workstation | id, tenantId, deviceFingerprint, name, lastSeenAt | Desktop license binding |
| SyncOutbox | Outbound event queue | id, aggregateType, aggregateId, eventType, payload, status | Reliability pattern |
| IntegrationJob | External sync state | id, type, status, lastAttemptAt, error | Directory, payments, ERP |

### Recommended Storage Strategy
- PostgreSQL for transactional source of truth.
- Redis for short-lived sessions, locks, rate limiting, and ephemeral queues.
- Local SQLite on the desktop for offline cache, queued mutations, and fast lookup.
- Object storage for attachments, receipts, exports, and signed audit packages.
- Append-only audit store or immutable log table with hash chaining for sensitive events.

### Indexing Priorities
- Patient lookup by phone, name, mrn.
- Item lookup by barcode, sku, generic name, brand name.
- Batch lookup by itemId plus expiryDate.
- Sale lookup by receipt number, cashier, date.
- Prescription lookup by rxNo, patient, status.
- Audit lookup by actor, date range, entity, and action.

## 7. RBAC Model
### Core Roles
- Cashier
- Pharmacy Technician
- Pharmacist
- Inventory Manager
- Store Manager
- Auditor
- System Admin
- Tenant Admin
- Support Admin

### Permission Groups
- Sales: create sale, void sale, refund sale, apply discount, override price.
- Prescription: create, verify, dispense, reverse, counsel, substitute.
- Inventory: receive, transfer, count, adjust, quarantine, write off.
- Compliance: view audit, export audit, controlled substance reporting.
- Admin: manage users, roles, settings, devices, licenses, integrations.
- Finance: cash close, end-of-day reconcile, payment reports.

### Authorization Rules
- Sensitive actions require step-up approval based on policy.
- Controlled substance actions require pharmacist or higher.
- Refunds over threshold require manager approval.
- Price overrides should be logged with reason codes.
- Directory groups should map to application roles, but application permissions remain the final authority.

## 8. Licensing and VPLA Model
Use a signed license entitlement model rather than a simple text key.
- License payload should contain tenant, plan, feature flags, expiry, environment scope, and device limits.
- Activation should bind to tenant and optionally to a device fingerprint.
- Desktop should support offline grace period with signed cached entitlement.
- License renewals should be checked periodically and cached locally.
- Deactivation should revoke the device token and sync status centrally.
- Admin screens should show remaining days, connected devices, and feature availability.

## 9. Enterprise Directory Infrastructure
### Identity Topology
- Primary auth through Entra ID or another enterprise IdP via OIDC/SAML.
- Optional local emergency admin account only for break-glass scenarios.
- Group-based mapping from directory groups to application roles.
- MFA enforced for privileged and remote access.
- SCIM-style provisioning preferred for user lifecycle management.

### Supporting Services
- Identity provider
- Directory group sync job
- Token exchange service
- Policy engine for role and location scope
- Session and device registry
- Break-glass recovery path

### Operational Policies
- Short access token TTL.
- Revocation support for departed staff.
- Session timeout and inactivity lock on register terminals.
- Hardware-backed device identity if available.

## 10. Application Architecture
### Desktop Architecture
- Desktop shell: Electron for broad device support and mature printer/scanner integration.
- UI layer: React with a strongly opinionated, keyboard-first component system.
- Local storage: SQLite plus encrypted secrets store.
- Local sync agent: queues writes and reconciles with the backend.
- Printer service: receipt, label, and barcode printers.

### Backend Architecture
- NestJS as the core domain API and orchestration layer.
- Modular services for auth, sales, inventory, prescriptions, patients, reporting, licensing, sync, and integrations.
- Event-driven side effects using an outbox pattern.
- Read models optimized for search and dashboard use.
- Background jobs for expiry alerts, sync, reporting, and entitlement checks.

### Reliability Patterns
- Idempotency keys for sale, refund, inventory transfer, and license activation.
- Optimistic concurrency on inventory and prescription state.
- Transactional outbox for audit and downstream events.
- Retry queues with dead-letter handling.

## 11. File Structure
```text
pharmacy-pos/
  apps/
    desktop/
      src/
        main/
        preload/
        renderer/
      assets/
    api/
      src/
        modules/
          auth/
          directory/
          licensing/
          patients/
          prescriptions/
          inventory/
          sales/
          payments/
          refunds/
          reporting/
          audit/
          integrations/
          sync/
        common/
        infrastructure/
        app.module.ts
  packages/
    domain/
    contracts/
    ui/
    config/
    utils/
  prisma/ or migrations/
  infra/
    docker/
    k8s/
    terraform/ or bicep/
  docs/
    product/
    architecture/
    compliance/
    ux/
  tests/
    unit/
    integration/
    e2e/
```

## 12. UI/UX Direction
### Design Goals
- Fast, calm, and highly legible.
- Built for tired staff under time pressure.
- Low cognitive load and clear error recovery.

### Visual Language
- Use a neutral clinical palette with strong contrast and restrained accent colors.
- Prefer large type, roomy spacing, and visibly grouped controls.
- Distinguish operational states by color and iconography, not by dense text.
- Avoid generic dashboard clutter; the checkout lane should feel like an instrument panel.

### Key Screens
- Counter home: scan bar, active basket, patient panel, and tender actions.
- Prescription workspace: status timeline, patient summary, warnings, and dispense actions.
- Inventory workspace: stock by batch, expiry, FEFO, transfers, and count adjustments.
- Shift close screen: drawer totals, exceptions, and approval queue.
- Admin center: users, roles, devices, licenses, and integrations.

### Interaction Patterns
- Persistent barcode input focus.
- Hotkeys for common actions.
- Inline validation and no surprise modal flows.
- Prominent recovery actions for undo, cancel, and reprint.
- Always show current context: location, cashier, patient, and license state.

## 13. Security and Compliance Controls
- Full audit trail on every sensitive action.
- Field-level masking for regulated or sensitive values.
- Encrypted local cache and secure token storage.
- Role-based data access by tenant and location.
- Device trust and session locking.
- Backup, retention, purge, and legal hold workflows.
- Incident response runbook and alerting for abnormal actions.

## 14. Delivery Roadmap
### Milestone 1
- Monorepo scaffold
- Core domain model
- Auth, RBAC, and license activation
- Desktop shell and basic counter UI

### Milestone 2
- Inventory, patient, prescription, and sale workflows
- Audit trail and reporting foundation
- Offline sync and local database

### Milestone 3
- Payments, refunds, shift close, and device integrations
- Directory sync and enterprise admin
- Hardening, testing, telemetry, and deployment pipeline

### Milestone 4
- Multi-store, advanced procurement, regulatory exports, and integrations

## 15. Key Risks
- Trying to implement a retail POS instead of a regulated pharmacy workflow engine.
- Underestimating offline sync complexity.
- Treating inventory as a simple stock counter rather than a lot-tracked ledger.
- Allowing unlogged overrides or silent corrections.
- Overloading the UI with administrative clutter.

## 16. Immediate Build Order
1. Define the domain model and permission matrix.
2. Scaffold the NestJS monorepo and desktop shell.
3. Implement auth, directory mapping, and license activation.
4. Build inventory and prescription ledgers with audit and idempotency.
5. Build the counter UI and offline sync path.
6. Add reporting, approvals, and enterprise hardening.

## 17. Sources Consulted
- HHS HIPAA Security Rule guidance
- HHS cybersecurity guidance for HIPAA entities
- PCI Security Standards Council overview
- Pharmacy POS vendor feature pages describing batch/expiry, FEFO, prescriptions, controlled substance records, and reporting

## 18. Medora Backend Blueprint
### 18.1 Target Shape
Medora should start as a NestJS monorepo with PostgreSQL as the system of record, Redis for ephemeral concerns, and a clean separation between API, domain logic, persistence, and background workers. The MVP should optimize for traceability, testability, and eventual offline sync rather than for maximal framework abstraction.

### 18.2 Monorepo Recommendation
- `apps/api`: NestJS HTTP API and orchestration layer.
- `apps/worker`: background jobs, outbox consumers, alerts, reports, and sync reconciliation.
- `apps/admin` or `apps/web`: staff/admin UI if kept in the same repository.
- `packages/domain`: entity models, value objects, domain events, policies, and invariants.
- `packages/contracts`: DTOs, API schemas, event contracts, and shared types.
- `packages/db`: Prisma schema or TypeORM entities, migrations, seed data, and repository adapters.
- `packages/config`: env parsing, feature flags, logging, and runtime settings.
- `packages/testing`: test fixtures, builders, and shared mocks.

### 18.3 Core NestJS Modules
- `auth`: OIDC/Entra login, sessions, refresh, device trust, and token issuance.
- `tenancy`: tenant isolation, location scoping, and request context.
- `rbac`: roles, permissions, approval policies, and step-up checks.
- `users`: staff profiles, directory mapping, and status management.
- `patients`: patient identity, contact data, allergies, consent, and history.
- `prescriptions`: rx intake, verification, dispense, reversal, substitutions, and refill state.
- `inventory`: item master, lot/batch tracking, FEFO, counts, transfers, and adjustments.
- `sales`: basket, pricing, tender, receipt, voids, refunds, and cash drawer sessions.
- `payments`: payment provider integration and tender reconciliation.
- `audit`: immutable audit events, reason codes, and exportable trails.
- `licensing`: tenant entitlements, device binding, offline grace, and renewal checks.
- `sync`: outbox, idempotency, conflict handling, and offline mutation replay.
- `reporting`: read models, daily summaries, expiry exposure, and close-of-day outputs.
- `integrations`: directory sync, printers, barcode devices, and future external systems.

### 18.4 Database Entity Set
Use PostgreSQL for transactional data and keep the first schema focused on the core workflow:
- Tenant, Location, User, Role, Permission, UserRole
- Patient, Prescriber, Prescription, PrescriptionLine
- Item, ItemVariant, BatchLot, InventoryBalance, InventoryMovement, StockCount
- Sale, SaleLine, Payment, Refund, CashDrawerSession
- License, Device, SyncOutbox, AuditEvent, IntegrationJob

Recommended modeling choices:
- Treat `InventoryMovement`, `AuditEvent`, and `SyncOutbox` as append-only records.
- Keep `InventoryBalance` and reporting tables as derived read models.
- Use optimistic concurrency for inventory, prescription state, and cash close.
- Enforce tenant scoping in every table and repository path.

### 18.5 Security and Validation
- Validate all inbound DTOs with class-validator or Zod at the edge.
- Use a global validation pipe, strict serialization, and explicit allowlists.
- Require request-scoped tenant, user, and location context for every write path.
- Log every sensitive action with actor, reason, source, and before/after state.
- Store secrets in a managed secret store and never in app config files.
- Keep payment handling isolated behind a narrow integration boundary.
- Prefer signed licenses, short-lived access tokens, and refresh-token rotation.

### 18.6 Testing Strategy
- Unit tests for domain rules, policy checks, and state transitions.
- Integration tests for repositories, transactions, migrations, and query behavior.
- Contract tests for DTOs, public endpoints, and event payloads.
- E2E tests for checkout, dispense, refund, inventory adjustment, and approvals.
- Worker tests for outbox processing, retry logic, and dead-letter behavior.
- Seeded test fixtures for tenant, location, user, patient, item, and lot scenarios.

### 18.7 Runtime and Deployment Assumptions
- NestJS runs as stateless containers behind a load balancer.
- PostgreSQL is managed, backed up, and monitored separately from the app.
- Redis is optional for locks, caching, and rate limiting, not for source-of-truth data.
- Background work runs in separate worker pods or jobs, not inside the API process.
- Migrations run before rollout and are backwards-compatible where possible.
- Observability should include structured logs, metrics, traces, and audit exports.

### 18.8 Recommended File Structure
```text
medora/
  apps/
    api/
      src/
        main.ts
        app.module.ts
        modules/
          auth/
          tenancy/
          rbac/
          users/
          patients/
          prescriptions/
          inventory/
          sales/
          payments/
          refunds/
          licensing/
          audit/
          reporting/
          integrations/
          sync/
        common/
          guards/
          filters/
          interceptors/
          pipes/
          decorators/
          utils/
    worker/
      src/
        main.ts
        jobs/
        consumers/
        schedulers/
  packages/
    domain/
      src/
        entities/
        value-objects/
        policies/
        events/
    contracts/
      src/
        dto/
        events/
        schemas/
    db/
      prisma/
      migrations/
      seeds/
      repositories/
    config/
      src/
        env/
        logging/
        feature-flags/
    testing/
      src/
        builders/
        fixtures/
        mocks/
  infra/
    docker/
    k8s/
    terraform/
  docs/
    architecture/
    compliance/
    runbooks/
```

### 18.9 MVP Build Order
1. Tenant, auth, RBAC, and request context.
2. PostgreSQL schema, migrations, and repository boundaries.
3. Patients, items, batches, and inventory ledger.
4. Prescriptions, sale checkout, payments, and refunds.
5. Audit trail, idempotency, and outbox processing.
6. Reporting read models, background jobs, and deployment hardening.
