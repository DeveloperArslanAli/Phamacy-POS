# 🏥 HMAT Pharmacy POS - Silver Sage Edition

A production-ready, desktop-first Pharmacy Point-of-Sale (POS) and Clinical Prescription Management system built with **NestJS**, **PostgreSQL**, **Prisma ORM**, and **Electron** featuring the modern **Silver Sage** aesthetic theme (`#E0E2DB`, `#D2D4C8`, `#B8BDB5`, `#889696`, `#5F7470`).

---

## 🌟 Key Features

### 📋 Production-Ready Pharmacy Prescription Queue
- **Clinical Prescription Data Fields**: Tracks Prescriber Doctor Name & NPI, Refills Allowed/Filled, Controlled Substance Schedule (`Schedule C-II`, `Legend`, `OTC`), Queue Priority Tags (`STAT` 🚨, `Urgent` ⚡, `Wait-in-Store` ⏳, `Routine`), and Patient Allergy Warning cross-checks.
- **5-Second Real-Time Polling Loop**: Automatic queue auto-refresh without page reloads.
- **Pharmacist Clinical Verification Sign-Off**: Interactive modal for reviewing drug-allergy interactions, pill counts, entering pharmacist check notes, and signing off on `pending` ➔ `verified` status transitions.
- **1-Click Fulfill to POS Counter Cart**: Direct button on `verified`/`dispensed` prescriptions to populate prescription medication lines and patient details into the POS Register cart.

### 🛒 Counter POS Register & Tender
- Barcode & SKU item lookup.
- Item quantity adjustment, tax & discount calculation.
- Patient profile attachment & split tender options (Cash, Card, Insurance).
- Printable receipt modal generation.

### 📦 Inventory Ledger & Batch Lots (FEFO)
- **Pharmaceutical Catalog**: Full item management with SKU/NDC, Generic Name (INN), Category, Storage Condition (`🏠 Room Temp`, `❄️ Refrigerated 2-8°C`, `🔒 Controlled Vault`), Bin Location, Manufacturer, Unit Price/Cost, and Reorder Point alerts.
- **FEFO Batch Tracker**: First-Expiry-First-Out (FEFO) batch lot tracking with color-coded expiry countdown badges (`🟢 340 Days`, `🟠 89 Days`, `🟡 14 Days`, `🔴 EXPIRED`), supplier names, initial quantities, and per-unit cost tracking.
- **4 Sub-Tab Dashboard**: Catalog & Balances, FEFO Batch Tracker, Stock Movements Log, and Expiry & Low Stock Alerts — each with dedicated tables and real-time data.
- **5 Live KPI Cards**: Total Retail Valuation ($), Catalog Items, Active Batches, Low Stock Alerts, Expiring ≤30 Days count.
- **Stock Adjustment Wizard**: Add/Deduct/Quarantine stock with reason tracking, audit trail, and movement logging.
- **Receive Batch Lot Modal**: Accept new wholesale deliveries with batch number, expiry date, initial qty, cost, and supplier.
- **Inventory Valuation API**: Real-time cost and retail valuation of total inventory assets.
- **5-Second Real-Time Polling**: Inventory KPIs and catalog balances auto-refresh without page reload.

### 👥 Patient Master Directory & Clinical Screening
- **Clinical & Demographic Fields**: Tracks Legal/Preferred Name, Sex/Gender, Date of Birth (DOB), Phone, Email, Primary Address, Deceased flag, SMS Refill Alert Opt-In, and Height/Weight parameters.
- **Third-Party Billing (NCPDP Card)**: Management of insurance routing details (BIN, PCN, Group, Member/Cardholder ID, Subscriber Relationship code, and Copay preferences).
- **HIPAA Notice & PPPA Safety-Cap Consent**: Notices of Privacy Practices (NPP) receipt logging and Poison Prevention Packaging Act blanket safety-cap easy-open waiver signatures.
- **Medication Dispensing History Timeline**: Dynamic chronological log of historic prescriptions directly inside the patient profile modal.
- **Real-Time Drug-Allergy Cross-Reactivity DUR Warnings**: Automated drug class verification (Penicillins, Cephalosporins, Sulfonamides, NSAIDs/Aspirin) that generates critical alerts during prescription verification.
- **DOB-based Directory Search**: Advanced search matching by full DOB date or partial birth year.
- **Role-based Access Control (RBAC)**: `Admin`, `Pharmacist`, `Cashier`, `Manager`, `Staff` with a quick switcher in the bottom-left corner.

---

## 🏗️ Tech Stack

- **Backend API**: NestJS, TypeScript, Passport JWT, Role Guards, Prisma ORM, PostgreSQL.
- **Desktop UI**: Electron Renderer, HTML5, Vanilla CSS (Silver Sage Design Tokens), Modern Async JavaScript.
- **Persistence**: PostgreSQL Database (`hmat_pharmacy`), Sync Outbox Event Logging, System Audit Trail.

---

## 🚀 Quick Start & Installation

### Prerequisites
- **Node.js**: v18.0.0 or higher
- **PostgreSQL**: Running locally on port `5432` (Default database: `hmat_pharmacy`, User: `postgres`, Password: `1234` or set in `apps/api/.env`)

### Step 1: Install Dependencies
```bash
npm install
```

### Step 2: Configure Environment Variables
Copy or verify `apps/api/.env`:
```env
DATABASE_URL="postgresql://postgres:1234@localhost:5432/hmat_pharmacy?schema=public"
PORT=3000
```

### Step 3: Setup Database Schema & Clinical Seed Data
Run the automated setup script to push the Prisma schema and seed clinical data:
```bash
npm run setup
```
*Or execute individually:*
```bash
npm run db:push
npm run db:seed
```

### Step 4: Run the Application

#### Option A: Run Full Application (API + Desktop UI Concurrently)
```bash
npm run dev
```

#### Option B: Run Services Individually
- **Start NestJS API Backend (`http://localhost:3000`)**:
  ```bash
  npm run dev:api
  ```
- **Start Electron Desktop Application**:
  ```bash
  npm run dev:desktop
  ```

---

## 📜 Available NPM Scripts

| Command | Action |
|---|---|
| `npm run dev` | Runs both NestJS API & Electron Desktop App concurrently |
| `npm run dev:api` | Starts the NestJS API server on `http://localhost:3000` |
| `npm run dev:desktop` | Launches the Electron Desktop App shell |
| `npm run build` | Compiles NestJS TypeScript backend & Desktop bundle |
| `npm run db:push` | Syncs Prisma schema directly with PostgreSQL database |
| `npm run db:seed` | Seeds database with demo Patients, Items, Batches, and Prescriptions |
| `npm run setup` | One-command install, schema sync, and database seeding |

---

## 🏛️ Project Structure

```
├── apps/
│   ├── api/                     # NestJS Backend API
│   │   ├── prisma/
│   │   │   ├── schema.prisma    # Database entities & relationships
│   │   │   └── seed.ts          # Clinical seed data script
│   │   ├── src/
│   │   │   ├── auth/            # JWT Strategy, Roles Guard, Auth Controller
│   │   │   ├── prescriptions/   # Prescription Queue & Verification Service
│   │   │   ├── inventory/       # Stock Ledger, Batches, Movements & Adjustments
│   │   │   ├── checkout/        # POS Checkout & Tender Processing
│   │   │   ├── patients/        # Patient Master Directory Service
│   │   │   ├── users/           # Staff User Management & Role Assignment
│   │   │   ├── catalog/         # Product Lookup & Barcode Search
│   │   │   ├── refund/          # Refund Request & Approval Logic
│   │   │   ├── audit/           # Audit Event Trail Service
│   │   │   ├── sync/            # Sync Outbox Log Processing
│   │   │   └── app.module.ts    # Root NestJS Module
│   └── desktop/                 # Electron Desktop Application
│       ├── main.js              # Main Electron process
│       ├── preload.js           # IPC bridge preload script
│       └── renderer/            # Desktop Renderer UI
│           ├── index.html       # Layout markup & multi-tab structure
│           ├── style.css        # Silver Sage design system tokens & styling
│           └── app.js           # Real-time polling, fetch API logic & UI modals
└── package.json                 # Workspace root scripts & dependencies
```

---

## 🔑 Demo Login Credentials

You can test different user roles using the quick role switcher in the bottom-left corner of the Desktop UI or using these seeded credentials:

- **Cashier**: `cashier@hmatpharmacy.local` / `admin1234`
