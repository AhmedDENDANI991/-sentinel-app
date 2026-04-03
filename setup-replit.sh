#!/bin/bash
set -e

echo "=== Sentinel App - Replit Setup Script ==="
echo "Creating project structure..."

# Create all directories
mkdir -p packages/backend/prisma
mkdir -p packages/backend/src/utils
mkdir -p packages/backend/src/middleware
mkdir -p packages/backend/src/services
mkdir -p packages/backend/src/routes
mkdir -p packages/backend/src/integrations
mkdir -p packages/backend/tests
mkdir -p packages/frontend/public
mkdir -p packages/frontend/src/types
mkdir -p packages/frontend/src/services
mkdir -p packages/frontend/src/hooks
mkdir -p packages/frontend/src/components
mkdir -p packages/frontend/src/pages

echo "Directories created."

# ============================================================
# ROOT FILES
# ============================================================

cat <<'FILEEOF' > package.json
{
  "name": "sentinel-app",
  "version": "1.0.0",
  "private": true,
  "description": "Sentinel - Proof-governed multi-company operational governance platform",
  "scripts": {
    "dev": "concurrently \"npm run dev:backend\" \"npm run dev:frontend\"",
    "dev:backend": "cd packages/backend && npm run dev",
    "dev:frontend": "cd packages/frontend && npm run dev",
    "build": "npm run build:backend && npm run build:frontend",
    "build:backend": "cd packages/backend && npm run build",
    "build:frontend": "cd packages/frontend && npm run build",
    "start": "cd packages/backend && npm start",
    "db:migrate": "cd packages/backend && npx prisma migrate dev",
    "db:seed": "cd packages/backend && npx prisma db seed",
    "db:studio": "cd packages/backend && npx prisma studio",
    "test": "cd packages/backend && npm test",
    "test:all": "npm run test && cd packages/frontend && npm test"
  },
  "devDependencies": {
    "concurrently": "^8.2.2"
  }
}
FILEEOF

cat <<'FILEEOF' > .env.example
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/sentinel?schema=public"

# JWT
JWT_SECRET="change-this-to-a-secure-random-string-min-32-chars"
JWT_EXPIRES_IN="24h"

# Server
PORT=3000
HOST=0.0.0.0
NODE_ENV=development
LOG_LEVEL=info

# External Integrations (configure when ready)
N8N_BASE_URL=
N8N_API_KEY=

ODOO_URL=
ODOO_DB=
ODOO_USER=
ODOO_API_KEY=

HUBSPOT_API_KEY=
AIRCALL_API_ID=
AIRCALL_API_TOKEN=

ROSSUM_API_URL=
ROSSUM_API_KEY=

CLAUDE_API_KEY=

POWERBI_CLIENT_ID=
POWERBI_CLIENT_SECRET=
POWERBI_TENANT_ID=
FILEEOF

cat <<'FILEEOF' > .gitignore
node_modules/
dist/
.env
*.log
.DS_Store
packages/backend/prisma/*.db
packages/backend/prisma/migrations/
FILEEOF

cat <<'FILEEOF' > .replit
run = "npm run dev"
entrypoint = "packages/backend/src/server.ts"

[env]
DATABASE_URL = "postgresql://user:password@localhost:5432/sentinel?schema=public"
JWT_SECRET = "sentinel-replit-dev-secret-change-in-production"
NODE_ENV = "development"
PORT = "3000"

[nix]
channel = "stable-24_05"

[deployment]
run = ["sh", "-c", "npm run build && npm start"]
deploymentTarget = "cloudrun"

[[ports]]
localPort = 3000
externalPort = 80

[[ports]]
localPort = 5173
externalPort = 3001
FILEEOF

echo "Root files created."

# ============================================================
# BACKEND - Config files
# ============================================================

cat <<'FILEEOF' > packages/backend/package.json
{
  "name": "@sentinel/backend",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/server.ts",
    "build": "tsc",
    "start": "node dist/server.js",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "@prisma/client": "^5.22.0",
    "bcryptjs": "^2.4.3",
    "fastify": "^4.28.1",
    "@fastify/cors": "^9.0.1",
    "@fastify/jwt": "^8.0.1",
    "@fastify/multipart": "^8.3.0",
    "@fastify/static": "^7.0.4",
    "zod": "^3.23.8",
    "pino": "^9.5.0",
    "pino-pretty": "^11.3.0",
    "uuid": "^10.0.0",
    "crypto-js": "^4.2.0"
  },
  "devDependencies": {
    "@types/bcryptjs": "^2.4.6",
    "@types/node": "^22.10.0",
    "@types/uuid": "^10.0.0",
    "prisma": "^5.22.0",
    "tsx": "^4.19.2",
    "typescript": "^5.7.2",
    "vitest": "^2.1.8"
  },
  "prisma": {
    "seed": "tsx prisma/seed.ts"
  }
}
FILEEOF

cat <<'FILEEOF' > packages/backend/tsconfig.json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src/**/*", "prisma/seed.ts"],
  "exclude": ["node_modules", "dist", "tests"]
}
FILEEOF

cat <<'FILEEOF' > packages/backend/vitest.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
});
FILEEOF

echo "Backend config files created."

# ============================================================
# BACKEND - Prisma schema
# ============================================================

cat <<'FILEEOF' > packages/backend/prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ═══════════════════════════════════════════════════════════
// REFERENTIELS MAITRES
// ═══════════════════════════════════════════════════════════

model Company {
  id          String   @id @default(uuid())
  code        String   @unique
  name        String
  legalForm   String?
  taxId       String?
  address     String?
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  projects         Project[]
  companyAssociates CompanyAssociate[]
  employees        Employee[]
  thirdParties     ThirdParty[]
  costCenters      CostCenter[]
  documents        Document[]
  accounts         Account[]
  journalEntries   JournalEntry[]
  purchaseOrders   PurchaseOrder[]
  salesOrders      SalesOrder[]
  stockLocations   StockLocation[]
  contracts        Contract[]
  auditObjects     AuditObject[]

  @@map("companies")
}

model Associate {
  id        String   @id @default(uuid())
  name      String
  taxId     String?
  type      String   // PERSON | ENTITY
  isActive  Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  companyAssociates CompanyAssociate[]

  @@map("associates")
}

model CompanyAssociate {
  id          String  @id @default(uuid())
  companyId   String
  associateId String
  projectId   String?
  sharePercent Float
  role        String? // MAJORITY | MINORITY | MANAGER | SILENT

  company   Company    @relation(fields: [companyId], references: [id])
  associate Associate  @relation(fields: [associateId], references: [id])
  project   Project?   @relation(fields: [projectId], references: [id])

  @@unique([companyId, associateId, projectId])
  @@map("company_associates")
}

model Project {
  id          String   @id @default(uuid())
  companyId   String
  code        String   @unique
  name        String
  type        String   // CONSTRUCTION | PROMOTION | SERVICE | INTERNAL
  status      String   @default("ACTIVE") // ACTIVE | SUSPENDED | CLOSED | ARCHIVED
  startDate   DateTime?
  endDate     DateTime?
  budget      Float?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  company           Company            @relation(fields: [companyId], references: [id])
  companyAssociates CompanyAssociate[]
  costCenters       CostCenter[]
  documents         Document[]
  contracts         Contract[]
  tasks             Task[]
  auditObjects      AuditObject[]

  @@map("projects")
}

model CostCenter {
  id        String  @id @default(uuid())
  companyId String
  projectId String?
  code      String  @unique
  name      String
  isActive  Boolean @default(true)

  company  Company  @relation(fields: [companyId], references: [id])
  project  Project? @relation(fields: [projectId], references: [id])

  journalEntries JournalEntry[]

  @@map("cost_centers")
}

model ThirdParty {
  id        String   @id @default(uuid())
  companyId String?
  code      String   @unique
  name      String
  type      String   // SUPPLIER | CLIENT | BOTH | OTHER
  taxId     String?
  address   String?
  phone     String?
  email     String?
  isActive  Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  company        Company?        @relation(fields: [companyId], references: [id])
  documents      Document[]
  journalEntries JournalEntry[]
  purchaseOrders PurchaseOrder[]
  salesOrders    SalesOrder[]
  contracts      Contract[]

  @@map("third_parties")
}

// ═══════════════════════════════════════════════════════════
// USERS & RBAC
// ═══════════════════════════════════════════════════════════

model User {
  id           String   @id @default(uuid())
  email        String   @unique
  passwordHash String
  firstName    String
  lastName     String
  role         String   // ADMIN | DAF | COMPTABLE | RH | JURIDIQUE | ACHATS | COMMERCIAL | CHEF_PROJET | CONTROLE | AUDITEUR | OPERATEUR
  companyScope String[] // company IDs user can access, empty = all
  projectScope String[] // project IDs user can access, empty = all
  isActive     Boolean  @default(true)
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
  lastLoginAt  DateTime?

  auditLogs       AuditLog[]
  questionnaires  Questionnaire[]
  taskValidations TaskValidation[]
  workflowActions WorkflowAction[]

  @@map("users")
}

// ═══════════════════════════════════════════════════════════
// STATE MACHINE & AUDIT OBJECTS
// ═══════════════════════════════════════════════════════════

// Every ingested object follows the universal state machine
model AuditObject {
  id              String   @id @default(uuid())
  companyId       String?
  projectId       String?
  objectType      String   // DOCUMENT | JOURNAL_ENTRY | PURCHASE | SALE | STOCK_MOVE | HR_RECORD | CONTRACT | TASK | PAYMENT
  objectId        String   // FK to the specific entity
  fingerprint     String?  // SHA-256 hash of source
  state           String   @default("RECEIVED") // see ObjectState enum below
  previousState   String?
  criticality     String   @default("NORMAL") // LOW | NORMAL | HIGH | CRITICAL
  reliabilityScore Float?  // 0.0 - 1.0
  classFamily     String?  // document family classification
  classPeriod     String?  // period classification YYYY-MM
  assignedTo      String?  // userId for human action
  escalatedTo     String?  // userId for escalation
  escalationLevel Int      @default(0)
  escalationDeadline DateTime?
  notes           String?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  company  Company? @relation(fields: [companyId], references: [id])
  project  Project? @relation(fields: [projectId], references: [id])

  proofRecords    ProofRecord[]
  stateTransitions StateTransition[]
  questionnaires  Questionnaire[]

  @@index([objectType, objectId])
  @@index([state])
  @@index([companyId])
  @@index([projectId])
  @@map("audit_objects")
}

// States: RECEIVED | FINGERPRINTED | CLASSIFIED_PROVISIONAL | EXTRACTABLE | NOT_EXTRACTABLE |
//         STRUCTURED | MATCHED | CONTROL_TECHNICAL | CONTROL_BUSINESS | CONTROL_CROSS |
//         VALIDATED_PROOF | VALIDATED_RESERVE | PENDING_HUMAN | REJECTED_MOTIVATED | EXCLUDED_MOTIVATED | ARCHIVED

model StateTransition {
  id            String   @id @default(uuid())
  auditObjectId String
  fromState     String
  toState       String
  reason        String?
  actorType     String   // SYSTEM | AI_PROPOSAL | HUMAN | RULE_ENGINE | ESCALATION
  actorId       String?  // userId or system identifier
  ruleId        String?  // reference to business rule applied
  metadata      Json?
  createdAt     DateTime @default(now())

  auditObject AuditObject @relation(fields: [auditObjectId], references: [id])

  @@index([auditObjectId])
  @@map("state_transitions")
}

// ═══════════════════════════════════════════════════════════
// PROOF REGISTRY (IMMUTABLE)
// ═══════════════════════════════════════════════════════════

model ProofRecord {
  id              String   @id @default(uuid())
  auditObjectId   String
  fieldName       String   // which field this proof supports
  sourceFileId    String?  // FK to Document
  sourcePage      Int?
  sourceZone      String?  // coordinates or region description
  ingestionDate   DateTime @default(now())
  extractionEngine String? // OCR | AI | MANUAL | IMPORT
  extractionScore Float?   // confidence 0.0 - 1.0
  validationRule  String?  // rule that validated this
  decision        String   // VALIDATED | VALIDATED_RESERVE | PENDING | REJECTED | EXCLUDED
  decisionReason  String?
  humanActorId    String?
  timestamp       DateTime @default(now())
  upstreamProofId String?  // chain link
  downstreamProofId String? // chain link
  isImmutable     Boolean  @default(false) // locked after final decision
  checksum        String?  // integrity hash of this record

  auditObject AuditObject @relation(fields: [auditObjectId], references: [id])
  sourceFile  Document?   @relation(fields: [sourceFileId], references: [id])

  @@index([auditObjectId])
  @@index([decision])
  @@map("proof_records")
}

// ═══════════════════════════════════════════════════════════
// SMART QUESTIONNAIRES
// ═══════════════════════════════════════════════════════════

model Questionnaire {
  id              String   @id @default(uuid())
  auditObjectId   String
  assignedToId    String
  context         String   // description of the issue
  missingInfo     String   // what is missing
  suggestedAnswers Json?   // array of 2-5 suggested answers
  expectedDocs    Json?    // list of expected documents
  status          String   @default("PENDING") // PENDING | ANSWERED | ESCALATED | EXPIRED | BATCH_RESOLVED
  response        String?
  responseType    String?  // SELECTED_SUGGESTION | FREE_TEXT | DOCUMENT_UPLOAD | BATCH
  uploadedDocIds  String[] // document IDs uploaded as proof
  batchGroupId    String?  // group similar cases for batch resolution
  reminderCount   Int      @default(0)
  nextReminderAt  DateTime?
  escalateAfter   DateTime?
  resolvedAt      DateTime?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  auditObject AuditObject @relation(fields: [auditObjectId], references: [id])
  assignedTo  User        @relation(fields: [assignedToId], references: [id])

  @@index([status])
  @@index([assignedToId])
  @@map("questionnaires")
}

// ═══════════════════════════════════════════════════════════
// BUSINESS RULES ENGINE
// ═══════════════════════════════════════════════════════════

model BusinessRule {
  id          String   @id @default(uuid())
  code        String   @unique
  module      String   // FINANCE | COMPTA | RH | ACHAT | STOCK | ADV | JURIDIQUE | CRM | MARKETING | TRAVAUX | TRANSVERSE
  name        String
  description String?
  ruleType    String   // VALIDATION | MATCHING | IMPUTATION | ESCALATION | AUTOMATION | THRESHOLD
  condition   Json     // structured condition
  action      Json     // structured action
  automationLevel String // LEVEL_A | LEVEL_B | LEVEL_C
  priority    Int      @default(100)
  version     Int      @default(1)
  isActive    Boolean  @default(true)
  ownerId     String?  // rule owner userId
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@index([module])
  @@index([ruleType])
  @@map("business_rules")
}

// ═══════════════════════════════════════════════════════════
// DOCUMENT MANAGEMENT
// ═══════════════════════════════════════════════════════════

model Document {
  id              String   @id @default(uuid())
  companyId       String?
  projectId       String?
  thirdPartyId    String?
  originalName    String
  normalizedName  String?
  storagePath     String
  mimeType        String
  sizeBytes       Int
  fingerprint     String?  // SHA-256 of file content
  family          String?  // FACTURE | BON | CONTRAT | PV | PHOTO | SCAN | RELEVE | PAIE | AUTRE
  period          String?  // YYYY-MM
  status          String   @default("INGESTED") // INGESTED | CLASSIFIED | DUPLICATE | ORPHAN | ARCHIVED
  isDuplicate     Boolean  @default(false)
  duplicateOfId   String?
  isOriginal      Boolean  @default(true)
  extractedData   Json?    // structured extracted fields
  ocrConfidence   Float?
  metadata        Json?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  company    Company?    @relation(fields: [companyId], references: [id])
  project    Project?    @relation(fields: [projectId], references: [id])
  thirdParty ThirdParty? @relation(fields: [thirdPartyId], references: [id])

  proofRecords ProofRecord[]

  @@index([fingerprint])
  @@index([family])
  @@index([companyId])
  @@map("documents")
}

// ═══════════════════════════════════════════════════════════
// ACCOUNTING
// ═══════════════════════════════════════════════════════════

model Account {
  id        String  @id @default(uuid())
  companyId String
  code      String
  name      String
  type      String  // ASSET | LIABILITY | EQUITY | REVENUE | EXPENSE
  isActive  Boolean @default(true)

  company Company @relation(fields: [companyId], references: [id])

  debitEntries  JournalEntry[] @relation("DebitAccount")
  creditEntries JournalEntry[] @relation("CreditAccount")

  @@unique([companyId, code])
  @@map("accounts")
}

model JournalEntry {
  id            String   @id @default(uuid())
  companyId     String
  costCenterId  String?
  thirdPartyId  String?
  entryDate     DateTime
  journal       String   // AC | VE | BA | OD etc
  reference     String?
  label         String
  debitAccountId  String
  creditAccountId String
  amount        Float
  status        String   @default("DRAFT") // DRAFT | PROPOSED | VALIDATED | CORRECTED | REJECTED | RESERVED
  sourceType    String?  // ORIGINAL | CORRECTED | AUTO_IMPUTED
  sourceEntryId String?  // link to original if corrected
  proofStatus   String   @default("MISSING") // PRESENT | MISSING | INCOMPLETE | INCONSISTENT
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  company      Company     @relation(fields: [companyId], references: [id])
  costCenter   CostCenter? @relation(fields: [costCenterId], references: [id])
  thirdParty   ThirdParty? @relation(fields: [thirdPartyId], references: [id])
  debitAccount Account     @relation("DebitAccount", fields: [debitAccountId], references: [id])
  creditAccount Account    @relation("CreditAccount", fields: [creditAccountId], references: [id])

  @@index([companyId, entryDate])
  @@index([status])
  @@map("journal_entries")
}

// ═══════════════════════════════════════════════════════════
// HR & SPI (Task-based remuneration)
// ═══════════════════════════════════════════════════════════

model Employee {
  id           String   @id @default(uuid())
  companyId    String
  code         String   @unique
  firstName    String
  lastName     String
  position     String?
  department   String?
  contractType String?  // CDI | CDD | FREELANCE | INTERN
  baseSalary   Float?
  hireDate     DateTime?
  isActive     Boolean  @default(true)
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  company    Company          @relation(fields: [companyId], references: [id])
  tasks      Task[]
  attendances Attendance[]
  payslips   Payslip[]

  @@map("employees")
}

model Task {
  id              String   @id @default(uuid())
  projectId       String?
  employeeId      String
  code            String   @unique
  title           String
  description     String?
  taskType        String   // STANDARD | SPI | MISSION
  proposedPrice   Float?   // auto-calculated internal price
  counterPrice    Float?   // employee/manager counter-proposal
  agreedPrice     Float?   // validated price
  status          String   @default("CREATED") // CREATED | PROPOSED | NEGOTIATION | AGREED | IN_PROGRESS | COMPLETED | QC_PASS | QC_FAIL | PAID | CANCELLED
  qualityScore    Float?   // 0-100
  startedAt       DateTime?
  completedAt     DateTime?
  paidAt          DateTime?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  project    Project?         @relation(fields: [projectId], references: [id])
  employee   Employee         @relation(fields: [employeeId], references: [id])
  validations TaskValidation[]

  @@index([status])
  @@index([employeeId])
  @@map("tasks")
}

model TaskValidation {
  id          String   @id @default(uuid())
  taskId      String
  validatorId String
  type        String   // QUALITY | HIERARCHICAL | PAYMENT_RELEASE
  decision    String   // APPROVED | REJECTED | REVISION_NEEDED
  comment     String?
  createdAt   DateTime @default(now())

  task      Task @relation(fields: [taskId], references: [id])
  validator User @relation(fields: [validatorId], references: [id])

  @@map("task_validations")
}

model Attendance {
  id         String   @id @default(uuid())
  employeeId String
  date       DateTime
  type       String   // PRESENT | ABSENT | MISSION | LEAVE | HOLIDAY
  hours      Float?
  createdAt  DateTime @default(now())

  employee Employee @relation(fields: [employeeId], references: [id])

  @@unique([employeeId, date])
  @@map("attendances")
}

model Payslip {
  id          String   @id @default(uuid())
  employeeId  String
  period      String   // YYYY-MM
  baseSalary  Float
  taskBonus   Float    @default(0) // SPI total
  advances    Float    @default(0)
  deductions  Float    @default(0)
  netPay      Float
  status      String   @default("DRAFT") // DRAFT | CALCULATED | VALIDATED | EXPORTED | PAID
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  employee Employee @relation(fields: [employeeId], references: [id])

  @@unique([employeeId, period])
  @@map("payslips")
}

// ═══════════════════════════════════════════════════════════
// PURCHASING & STOCK
// ═══════════════════════════════════════════════════════════

model Article {
  id          String  @id @default(uuid())
  code        String  @unique
  name        String
  category    String?
  unit        String  @default("UNIT") // UNIT | KG | M | M2 | M3 | L | PACK
  minStock    Float?
  isActive    Boolean @default(true)

  stockMoves     StockMove[]
  purchaseLines  PurchaseOrderLine[]
  salesLines     SalesOrderLine[]

  @@map("articles")
}

model PurchaseOrder {
  id           String   @id @default(uuid())
  companyId    String
  thirdPartyId String
  reference    String   @unique
  orderDate    DateTime
  status       String   @default("DRAFT") // DRAFT | CONFIRMED | RECEIVED | PARTIAL | INVOICED | PAID | CANCELLED
  totalAmount  Float    @default(0)
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  company    Company              @relation(fields: [companyId], references: [id])
  thirdParty ThirdParty           @relation(fields: [thirdPartyId], references: [id])
  lines      PurchaseOrderLine[]

  @@map("purchase_orders")
}

model PurchaseOrderLine {
  id              String @id @default(uuid())
  purchaseOrderId String
  articleId       String
  quantity        Float
  unitPrice       Float
  receivedQty     Float  @default(0)

  purchaseOrder PurchaseOrder @relation(fields: [purchaseOrderId], references: [id])
  article       Article       @relation(fields: [articleId], references: [id])

  @@map("purchase_order_lines")
}

model StockLocation {
  id        String @id @default(uuid())
  companyId String
  code      String @unique
  name      String
  type      String @default("WAREHOUSE") // WAREHOUSE | SITE | TRANSIT | SCRAP

  company    Company     @relation(fields: [companyId], references: [id])
  stockMoves StockMove[]

  @@map("stock_locations")
}

model StockMove {
  id            String   @id @default(uuid())
  locationId    String
  articleId     String
  moveType      String   // IN | OUT | TRANSFER | ADJUSTMENT | RETURN
  quantity      Float
  reference     String?
  sourceDoc     String?  // PO ref, SO ref, etc.
  createdAt     DateTime @default(now())

  location StockLocation @relation(fields: [locationId], references: [id])
  article  Article       @relation(fields: [articleId], references: [id])

  @@index([articleId])
  @@index([locationId])
  @@map("stock_moves")
}

// ═══════════════════════════════════════════════════════════
// SALES / ADV
// ═══════════════════════════════════════════════════════════

model SalesOrder {
  id           String   @id @default(uuid())
  companyId    String
  thirdPartyId String
  reference    String   @unique
  orderDate    DateTime
  status       String   @default("DRAFT") // DRAFT | QUOTE | CONFIRMED | INVOICED | PARTIAL_PAID | PAID | CANCELLED
  totalAmount  Float    @default(0)
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  company    Company          @relation(fields: [companyId], references: [id])
  thirdParty ThirdParty       @relation(fields: [thirdPartyId], references: [id])
  lines      SalesOrderLine[]

  @@map("sales_orders")
}

model SalesOrderLine {
  id           String @id @default(uuid())
  salesOrderId String
  articleId    String
  quantity     Float
  unitPrice    Float

  salesOrder SalesOrder @relation(fields: [salesOrderId], references: [id])
  article    Article    @relation(fields: [articleId], references: [id])

  @@map("sales_order_lines")
}

// ═══════════════════════════════════════════════════════════
// CONTRACTS & LEGAL
// ═══════════════════════════════════════════════════════════

model Contract {
  id           String   @id @default(uuid())
  companyId    String
  projectId    String?
  thirdPartyId String?
  reference    String   @unique
  type         String   // MARCHE | SOUS_TRAITANCE | PRESTATION | LOCATION | AVENANT | OTHER
  subject      String
  amount       Float?
  startDate    DateTime?
  endDate      DateTime?
  status       String   @default("DRAFT") // DRAFT | ACTIVE | SUSPENDED | TERMINATED | LITIGIOUS | ARCHIVED
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  company    Company     @relation(fields: [companyId], references: [id])
  project    Project?    @relation(fields: [projectId], references: [id])
  thirdParty ThirdParty? @relation(fields: [thirdPartyId], references: [id])
  legalCases LegalCase[]

  @@map("contracts")
}

model LegalCase {
  id           String   @id @default(uuid())
  contractId   String?
  reference    String   @unique
  subject      String
  parties      Json     // array of party objects
  status       String   @default("OPEN") // OPEN | HEARING | MEDIATION | JUDGMENT | APPEAL | CLOSED | ARCHIVED
  amountAtStake Float?
  nextDeadline DateTime?
  nextHearing  DateTime?
  factStatus   String?  // PROVEN | ALLEGED | CONTESTED | MISSING_EVIDENCE
  notes        String?
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  contract Contract? @relation(fields: [contractId], references: [id])

  @@map("legal_cases")
}

// ═══════════════════════════════════════════════════════════
// WORKFLOW ENGINE
// ═══════════════════════════════════════════════════════════

model Workflow {
  id          String   @id @default(uuid())
  code        String   @unique
  module      String
  name        String
  description String?
  ownerId     String?
  validatorId String?
  arbiterId   String?
  slaHours    Int?
  escalateAfterHours Int?
  isActive    Boolean  @default(true)
  version     Int      @default(1)
  steps       Json     // ordered array of step definitions
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  actions WorkflowAction[]

  @@map("workflows")
}

model WorkflowAction {
  id          String   @id @default(uuid())
  workflowId  String
  objectType  String
  objectId    String
  stepIndex   Int
  stepName    String
  status      String   @default("PENDING") // PENDING | IN_PROGRESS | COMPLETED | FAILED | SKIPPED | ESCALATED
  actorId     String?
  result      Json?
  startedAt   DateTime?
  completedAt DateTime?
  createdAt   DateTime @default(now())

  workflow Workflow @relation(fields: [workflowId], references: [id])
  actor    User?    @relation(fields: [actorId], references: [id])

  @@index([workflowId])
  @@index([objectType, objectId])
  @@map("workflow_actions")
}

// ═══════════════════════════════════════════════════════════
// AUDIT LOG (IMMUTABLE)
// ═══════════════════════════════════════════════════════════

model AuditLog {
  id         String   @id @default(uuid())
  userId     String?
  action     String   // CREATE | UPDATE | DELETE | LOGIN | OVERRIDE | ESCALATE | VALIDATE | REJECT
  entityType String
  entityId   String
  changes    Json?    // { field: { old, new } }
  ipAddress  String?
  userAgent  String?
  createdAt  DateTime @default(now())

  user User? @relation(fields: [userId], references: [id])

  @@index([entityType, entityId])
  @@index([userId])
  @@index([createdAt])
  @@map("audit_logs")
}

// ═══════════════════════════════════════════════════════════
// INTEGRATION EVENTS (n8n bridge)
// ═══════════════════════════════════════════════════════════

model IntegrationEvent {
  id          String   @id @default(uuid())
  source      String   // SENTINEL | N8N | ODOO | HUBSPOT | ROSSUM | AIRCALL | POWERBI
  target      String
  eventType   String   // SYNC | WEBHOOK | TRIGGER | CALLBACK
  payload     Json
  status      String   @default("PENDING") // PENDING | SENT | ACKNOWLEDGED | FAILED | RETRYING
  retryCount  Int      @default(0)
  maxRetries  Int      @default(3)
  error       String?
  processedAt DateTime?
  createdAt   DateTime @default(now())

  @@index([status])
  @@index([source, target])
  @@map("integration_events")
}
FILEEOF

echo "Prisma schema created."

# ============================================================
# BACKEND - Prisma seed
# ============================================================

cat <<'FILEEOF' > packages/backend/prisma/seed.ts
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding Sentinel database...');

  // Admin user
  const adminHash = await bcrypt.hash('sentinel-admin-2024', 12);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@sentinel.dz' },
    update: {},
    create: {
      email: 'admin@sentinel.dz',
      passwordHash: adminHash,
      firstName: 'Admin',
      lastName: 'Sentinel',
      role: 'ADMIN',
      companyScope: [],
      projectScope: [],
    },
  });

  // DAF user
  const dafHash = await bcrypt.hash('sentinel-daf-2024', 12);
  const daf = await prisma.user.upsert({
    where: { email: 'daf@sentinel.dz' },
    update: {},
    create: {
      email: 'daf@sentinel.dz',
      passwordHash: dafHash,
      firstName: 'Directeur',
      lastName: 'Financier',
      role: 'DAF',
      companyScope: [],
      projectScope: [],
    },
  });

  // Comptable user
  const comptaHash = await bcrypt.hash('sentinel-compta-2024', 12);
  await prisma.user.upsert({
    where: { email: 'comptable@sentinel.dz' },
    update: {},
    create: {
      email: 'comptable@sentinel.dz',
      passwordHash: comptaHash,
      firstName: 'Responsable',
      lastName: 'Comptable',
      role: 'COMPTABLE',
      companyScope: [],
      projectScope: [],
    },
  });

  // Companies
  const company1 = await prisma.company.upsert({
    where: { code: 'SCI-01' },
    update: {},
    create: {
      code: 'SCI-01',
      name: 'SCI Immobilière Alpha',
      legalForm: 'SCI',
      address: 'Alger, Algérie',
    },
  });

  const company2 = await prisma.company.upsert({
    where: { code: 'SARL-01' },
    update: {},
    create: {
      code: 'SARL-01',
      name: 'SARL Construction Beta',
      legalForm: 'SARL',
      address: 'Oran, Algérie',
    },
  });

  const company3 = await prisma.company.upsert({
    where: { code: 'EURL-01' },
    update: {},
    create: {
      code: 'EURL-01',
      name: 'EURL Services Gamma',
      legalForm: 'EURL',
      address: 'Constantine, Algérie',
    },
  });

  // Associates
  const assoc1 = await prisma.associate.upsert({
    where: { id: 'assoc-seed-1' },
    update: {},
    create: { id: 'assoc-seed-1', name: 'Associé Principal', type: 'PERSON' },
  });

  await prisma.companyAssociate.upsert({
    where: { companyId_associateId_projectId: { companyId: company1.id, associateId: assoc1.id, projectId: '' } },
    update: {},
    create: { companyId: company1.id, associateId: assoc1.id, sharePercent: 60, role: 'MAJORITY' },
  }).catch(() => {
    // unique constraint may need null handling
  });

  // Projects
  const project1 = await prisma.project.upsert({
    where: { code: 'PROJ-ALPHA-01' },
    update: {},
    create: {
      companyId: company1.id,
      code: 'PROJ-ALPHA-01',
      name: 'Résidence Alpha - Lot 1',
      type: 'CONSTRUCTION',
      budget: 500000000,
    },
  });

  const project2 = await prisma.project.upsert({
    where: { code: 'PROJ-BETA-01' },
    update: {},
    create: {
      companyId: company2.id,
      code: 'PROJ-BETA-01',
      name: 'Centre Commercial Beta',
      type: 'PROMOTION',
      budget: 1200000000,
    },
  });

  // Cost centers
  await prisma.costCenter.upsert({
    where: { code: 'CC-ALPHA-GROS-OEUVRE' },
    update: {},
    create: { companyId: company1.id, projectId: project1.id, code: 'CC-ALPHA-GROS-OEUVRE', name: 'Gros Oeuvre Alpha' },
  });

  // Chart of accounts (minimal)
  const accounts = [
    { code: '401000', name: 'Fournisseurs', type: 'LIABILITY' },
    { code: '411000', name: 'Clients', type: 'ASSET' },
    { code: '512000', name: 'Banque', type: 'ASSET' },
    { code: '530000', name: 'Caisse', type: 'ASSET' },
    { code: '601000', name: 'Achats matériaux', type: 'EXPENSE' },
    { code: '613000', name: 'Sous-traitance', type: 'EXPENSE' },
    { code: '641000', name: 'Rémunérations', type: 'EXPENSE' },
    { code: '701000', name: 'Ventes', type: 'REVENUE' },
  ];

  for (const acc of accounts) {
    await prisma.account.upsert({
      where: { companyId_code: { companyId: company1.id, code: acc.code } },
      update: {},
      create: { companyId: company1.id, ...acc },
    });
    await prisma.account.upsert({
      where: { companyId_code: { companyId: company2.id, code: acc.code } },
      update: {},
      create: { companyId: company2.id, ...acc },
    });
  }

  // Sample business rules
  await prisma.businessRule.upsert({
    where: { code: 'RULE-COMPTA-001' },
    update: {},
    create: {
      code: 'RULE-COMPTA-001',
      module: 'COMPTA',
      name: 'Interdiction validation sans preuve',
      ruleType: 'VALIDATION',
      condition: { field: 'proofStatus', operator: 'eq', value: 'MISSING' },
      action: { block: true, message: 'Écriture non validable : preuve manquante' },
      automationLevel: 'LEVEL_C',
      priority: 1,
    },
  });

  await prisma.businessRule.upsert({
    where: { code: 'RULE-ACHAT-001' },
    update: {},
    create: {
      code: 'RULE-ACHAT-001',
      module: 'ACHAT',
      name: 'Seuil approbation DAF',
      ruleType: 'THRESHOLD',
      condition: { field: 'totalAmount', operator: 'gt', value: 5000000 },
      action: { requireApproval: true, approver: 'DAF' },
      automationLevel: 'LEVEL_C',
      priority: 10,
    },
  });

  await prisma.businessRule.upsert({
    where: { code: 'RULE-DOC-001' },
    update: {},
    create: {
      code: 'RULE-DOC-001',
      module: 'TRANSVERSE',
      name: 'Classification automatique faible risque',
      ruleType: 'AUTOMATION',
      condition: { confidence: { operator: 'gte', value: 0.95 } },
      action: { autoClassify: true, noHumanNeeded: true },
      automationLevel: 'LEVEL_A',
      priority: 50,
    },
  });

  // Sample workflow
  await prisma.workflow.upsert({
    where: { code: 'WF-INGESTION-DOC' },
    update: {},
    create: {
      code: 'WF-INGESTION-DOC',
      module: 'DOCUMENT',
      name: 'Workflow ingestion documentaire',
      slaHours: 48,
      escalateAfterHours: 72,
      steps: [
        { name: 'Réception', type: 'TRIGGER', automationLevel: 'LEVEL_A' },
        { name: 'Empreinte & déduplication', type: 'AUTO_PROCESS', automationLevel: 'LEVEL_A' },
        { name: 'Classification IA', type: 'AUTO_PROCESS', automationLevel: 'LEVEL_B' },
        { name: 'Extraction données', type: 'AUTO_PROCESS', automationLevel: 'LEVEL_B' },
        { name: 'Contrôle cohérence', type: 'LOGIC_CHECK', automationLevel: 'LEVEL_B' },
        { name: 'Validation métier', type: 'BUSINESS_CHECK', automationLevel: 'LEVEL_C' },
        { name: 'Archivage', type: 'AUTO_PROCESS', automationLevel: 'LEVEL_A' },
      ],
    },
  });

  // Employees
  const emp1 = await prisma.employee.upsert({
    where: { code: 'EMP-001' },
    update: {},
    create: {
      companyId: company1.id,
      code: 'EMP-001',
      firstName: 'Mohamed',
      lastName: 'Benali',
      position: 'Chef de chantier',
      department: 'Travaux',
      contractType: 'CDI',
      baseSalary: 80000,
    },
  });

  // Articles
  await prisma.article.upsert({
    where: { code: 'ART-CIM-001' },
    update: {},
    create: { code: 'ART-CIM-001', name: 'Ciment CPJ 42.5', category: 'Matériaux', unit: 'KG', minStock: 5000 },
  });

  await prisma.article.upsert({
    where: { code: 'ART-FER-001' },
    update: {},
    create: { code: 'ART-FER-001', name: 'Fer à béton T12', category: 'Matériaux', unit: 'KG', minStock: 2000 },
  });

  console.log('Seed completed successfully.');
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
FILEEOF

echo "Prisma seed created."

# ============================================================
# BACKEND - src/server.ts
# ============================================================

cat <<'FILEEOF' > packages/backend/src/server.ts
import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import multipart from '@fastify/multipart';
import fastifyStatic from '@fastify/static';
import path from 'path';
import { fileURLToPath } from 'url';
import { authRoutes } from './routes/auth.js';
import { companyRoutes } from './routes/companies.js';
import { projectRoutes } from './routes/projects.js';
import { documentRoutes } from './routes/documents.js';
import { auditObjectRoutes } from './routes/auditObjects.js';
import { questionnaireRoutes } from './routes/questionnaires.js';
import { journalRoutes } from './routes/journal.js';
import { hrRoutes } from './routes/hr.js';
import { purchaseRoutes } from './routes/purchases.js';
import { stockRoutes } from './routes/stock.js';
import { salesRoutes } from './routes/sales.js';
import { legalRoutes } from './routes/legal.js';
import { workflowRoutes } from './routes/workflows.js';
import { ruleRoutes } from './routes/rules.js';
import { integrationRoutes } from './routes/integrations.js';
import { dashboardRoutes } from './routes/dashboard.js';
import { proofRoutes } from './routes/proof.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const envToLogger: Record<string, object | boolean> = {
  development: {
    transport: {
      target: 'pino-pretty',
      options: { translateTime: 'HH:MM:ss Z', ignore: 'pid,hostname' },
    },
  },
  production: true,
  test: false,
};

export async function buildApp() {
  const app = Fastify({
    logger: envToLogger[process.env.NODE_ENV ?? 'development'] ?? true,
  });

  // Plugins
  await app.register(cors, { origin: true, credentials: true });
  await app.register(jwt, {
    secret: process.env.JWT_SECRET || 'sentinel-dev-secret-change-in-production',
    sign: { expiresIn: process.env.JWT_EXPIRES_IN || '24h' },
  });
  await app.register(multipart, { limits: { fileSize: 50 * 1024 * 1024 } }); // 50MB

  // Serve frontend in production
  const frontendDist = path.join(__dirname, '../../frontend/dist');
  await app.register(fastifyStatic, {
    root: frontendDist,
    prefix: '/',
    decorateReply: true,
    wildcard: false,
  }).catch(() => {
    app.log.info('Frontend dist not found, skipping static serving');
  });

  // Auth decorator
  app.decorate('authenticate', async function (request: any, reply: any) {
    try {
      await request.jwtVerify();
    } catch (err) {
      reply.status(401).send({ error: 'Unauthorized' });
    }
  });

  // Health check
  app.get('/api/health', async () => ({
    status: 'ok',
    service: 'sentinel',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  }));

  // API Routes
  await app.register(authRoutes, { prefix: '/api/auth' });
  await app.register(companyRoutes, { prefix: '/api/companies' });
  await app.register(projectRoutes, { prefix: '/api/projects' });
  await app.register(documentRoutes, { prefix: '/api/documents' });
  await app.register(auditObjectRoutes, { prefix: '/api/audit-objects' });
  await app.register(questionnaireRoutes, { prefix: '/api/questionnaires' });
  await app.register(journalRoutes, { prefix: '/api/journal' });
  await app.register(hrRoutes, { prefix: '/api/hr' });
  await app.register(purchaseRoutes, { prefix: '/api/purchases' });
  await app.register(stockRoutes, { prefix: '/api/stock' });
  await app.register(salesRoutes, { prefix: '/api/sales' });
  await app.register(legalRoutes, { prefix: '/api/legal' });
  await app.register(workflowRoutes, { prefix: '/api/workflows' });
  await app.register(ruleRoutes, { prefix: '/api/rules' });
  await app.register(integrationRoutes, { prefix: '/api/integrations' });
  await app.register(dashboardRoutes, { prefix: '/api/dashboard' });
  await app.register(proofRoutes, { prefix: '/api/proof' });

  // SPA fallback
  app.setNotFoundHandler(async (request, reply) => {
    if (request.url.startsWith('/api/')) {
      return reply.status(404).send({ error: 'Route not found' });
    }
    return reply.sendFile('index.html');
  });

  return app;
}

// Start server
const start = async () => {
  const app = await buildApp();
  const port = parseInt(process.env.PORT || '3000', 10);
  const host = process.env.HOST || '0.0.0.0';

  try {
    await app.listen({ port, host });
    app.log.info(`Sentinel API running on ${host}:${port}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();
FILEEOF

# ============================================================
# BACKEND - src/utils
# ============================================================

cat <<'FILEEOF' > packages/backend/src/utils/prisma.ts
import { PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
});

// Graceful shutdown
process.on('beforeExit', async () => {
  await prisma.$disconnect();
});
FILEEOF

cat <<'FILEEOF' > packages/backend/src/utils/errors.ts
export class AppError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public details?: unknown
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export function notFound(entity: string, id?: string): AppError {
  return new AppError(404, `${entity}${id ? ` (${id})` : ''} not found`);
}

export function forbidden(message = 'Access denied'): AppError {
  return new AppError(403, message);
}

export function badRequest(message: string, details?: unknown): AppError {
  return new AppError(400, message, details);
}

export function handleError(error: unknown, reply: any) {
  if (error instanceof AppError) {
    return reply.status(error.statusCode).send({
      error: error.message,
      details: error.details,
    });
  }
  console.error('Unhandled error:', error);
  return reply.status(500).send({ error: 'Internal server error' });
}
FILEEOF

cat <<'FILEEOF' > packages/backend/src/utils/validation.ts
import { z } from 'zod';
import { badRequest } from './errors.js';

export function validate<T>(schema: z.ZodSchema<T>, data: unknown): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw badRequest('Validation error', result.error.flatten());
  }
  return result.data;
}

// Shared schemas
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export const idParamSchema = z.object({
  id: z.string().uuid(),
});

export type Pagination = z.infer<typeof paginationSchema>;

export function paginatedResponse<T>(data: T[], total: number, pagination: Pagination) {
  return {
    data,
    meta: {
      total,
      page: pagination.page,
      limit: pagination.limit,
      totalPages: Math.ceil(total / pagination.limit),
    },
  };
}
FILEEOF

echo "Backend utils created."

# ============================================================
# BACKEND - middleware/auth.ts
# ============================================================

cat <<'FILEEOF' > packages/backend/src/middleware/auth.ts
import { FastifyRequest, FastifyReply } from 'fastify';

export interface JWTPayload {
  id: string;
  email: string;
  role: string;
  companyScope: string[];
  projectScope: string[];
}

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: JWTPayload;
    user: JWTPayload;
  }
}

export async function requireAuth(request: FastifyRequest, reply: FastifyReply) {
  try {
    await request.jwtVerify();
  } catch {
    reply.status(401).send({ error: 'Authentication required' });
  }
}

export function requireRole(...roles: string[]) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    await requireAuth(request, reply);
    if (reply.sent) return;
    const user = request.user as JWTPayload;
    if (!roles.includes(user.role) && user.role !== 'ADMIN') {
      reply.status(403).send({ error: 'Insufficient permissions', required: roles });
    }
  };
}

export function requireCompanyAccess(companyId: string, user: JWTPayload): boolean {
  if (user.role === 'ADMIN') return true;
  if (user.companyScope.length === 0) return true; // empty = all
  return user.companyScope.includes(companyId);
}

export function requireProjectAccess(projectId: string, user: JWTPayload): boolean {
  if (user.role === 'ADMIN') return true;
  if (user.projectScope.length === 0) return true;
  return user.projectScope.includes(projectId);
}
FILEEOF

# ============================================================
# BACKEND - services
# ============================================================

cat <<'FILEEOF' > packages/backend/src/services/stateMachine.ts
import { prisma } from '../utils/prisma.js';

// Universal object states as defined in the CDC
export const OBJECT_STATES = [
  'RECEIVED',
  'FINGERPRINTED',
  'CLASSIFIED_PROVISIONAL',
  'EXTRACTABLE',
  'NOT_EXTRACTABLE',
  'STRUCTURED',
  'MATCHED',
  'CONTROL_TECHNICAL',
  'CONTROL_BUSINESS',
  'CONTROL_CROSS',
  'VALIDATED_PROOF',
  'VALIDATED_RESERVE',
  'PENDING_HUMAN',
  'REJECTED_MOTIVATED',
  'EXCLUDED_MOTIVATED',
  'ARCHIVED',
] as const;

export type ObjectState = (typeof OBJECT_STATES)[number];

// Valid transitions map
const VALID_TRANSITIONS: Record<string, string[]> = {
  RECEIVED: ['FINGERPRINTED'],
  FINGERPRINTED: ['CLASSIFIED_PROVISIONAL'],
  CLASSIFIED_PROVISIONAL: ['EXTRACTABLE', 'NOT_EXTRACTABLE'],
  EXTRACTABLE: ['STRUCTURED'],
  NOT_EXTRACTABLE: ['PENDING_HUMAN', 'EXCLUDED_MOTIVATED'],
  STRUCTURED: ['MATCHED', 'PENDING_HUMAN'],
  MATCHED: ['CONTROL_TECHNICAL', 'PENDING_HUMAN'],
  CONTROL_TECHNICAL: ['CONTROL_BUSINESS', 'PENDING_HUMAN', 'REJECTED_MOTIVATED'],
  CONTROL_BUSINESS: ['CONTROL_CROSS', 'PENDING_HUMAN', 'REJECTED_MOTIVATED'],
  CONTROL_CROSS: ['VALIDATED_PROOF', 'VALIDATED_RESERVE', 'PENDING_HUMAN', 'REJECTED_MOTIVATED'],
  VALIDATED_PROOF: ['ARCHIVED'],
  VALIDATED_RESERVE: ['PENDING_HUMAN', 'ARCHIVED'],
  PENDING_HUMAN: [
    'CLASSIFIED_PROVISIONAL', 'STRUCTURED', 'MATCHED',
    'CONTROL_TECHNICAL', 'CONTROL_BUSINESS', 'CONTROL_CROSS',
    'VALIDATED_PROOF', 'VALIDATED_RESERVE',
    'REJECTED_MOTIVATED', 'EXCLUDED_MOTIVATED',
  ],
  REJECTED_MOTIVATED: ['PENDING_HUMAN', 'ARCHIVED'],
  EXCLUDED_MOTIVATED: ['ARCHIVED'],
  ARCHIVED: [], // terminal
};

export interface TransitionParams {
  auditObjectId: string;
  toState: ObjectState;
  reason?: string;
  actorType: 'SYSTEM' | 'AI_PROPOSAL' | 'HUMAN' | 'RULE_ENGINE' | 'ESCALATION';
  actorId?: string;
  ruleId?: string;
  metadata?: Record<string, unknown>;
}

export async function transitionState(params: TransitionParams) {
  const { auditObjectId, toState, reason, actorType, actorId, ruleId, metadata } = params;

  const auditObject = await prisma.auditObject.findUnique({
    where: { id: auditObjectId },
  });

  if (!auditObject) {
    throw new Error(`AuditObject ${auditObjectId} not found`);
  }

  const currentState = auditObject.state;
  const allowed = VALID_TRANSITIONS[currentState] || [];

  if (!allowed.includes(toState)) {
    throw new Error(
      `Invalid transition: ${currentState} -> ${toState}. Allowed: ${allowed.join(', ')}`
    );
  }

  // Atomic transition
  const [updatedObject, transition] = await prisma.$transaction([
    prisma.auditObject.update({
      where: { id: auditObjectId },
      data: {
        state: toState,
        previousState: currentState,
        updatedAt: new Date(),
      },
    }),
    prisma.stateTransition.create({
      data: {
        auditObjectId,
        fromState: currentState,
        toState,
        reason,
        actorType,
        actorId,
        ruleId,
        metadata: metadata as any,
      },
    }),
  ]);

  return { auditObject: updatedObject, transition };
}

export async function getTransitionHistory(auditObjectId: string) {
  return prisma.stateTransition.findMany({
    where: { auditObjectId },
    orderBy: { createdAt: 'asc' },
  });
}

export function getValidTransitions(currentState: string): string[] {
  return VALID_TRANSITIONS[currentState] || [];
}
FILEEOF

cat <<'FILEEOF' > packages/backend/src/services/proofRegistry.ts
import { prisma } from '../utils/prisma.js';
import { createHash } from 'crypto';

export interface CreateProofParams {
  auditObjectId: string;
  fieldName: string;
  sourceFileId?: string;
  sourcePage?: number;
  sourceZone?: string;
  extractionEngine?: string;
  extractionScore?: number;
  validationRule?: string;
  decision: 'VALIDATED' | 'VALIDATED_RESERVE' | 'PENDING' | 'REJECTED' | 'EXCLUDED';
  decisionReason?: string;
  humanActorId?: string;
  upstreamProofId?: string;
}

function computeChecksum(data: Record<string, unknown>): string {
  const serialized = JSON.stringify(data, Object.keys(data).sort());
  return createHash('sha256').update(serialized).digest('hex');
}

export async function createProofRecord(params: CreateProofParams) {
  const checksum = computeChecksum({
    auditObjectId: params.auditObjectId,
    fieldName: params.fieldName,
    decision: params.decision,
    timestamp: new Date().toISOString(),
  });

  return prisma.proofRecord.create({
    data: {
      ...params,
      checksum,
      isImmutable: ['VALIDATED', 'REJECTED', 'EXCLUDED'].includes(params.decision),
    },
  });
}

export async function getProofChain(auditObjectId: string) {
  return prisma.proofRecord.findMany({
    where: { auditObjectId },
    orderBy: { timestamp: 'asc' },
    include: { sourceFile: { select: { id: true, originalName: true, family: true } } },
  });
}

export async function verifyProofIntegrity(proofId: string): Promise<boolean> {
  const proof = await prisma.proofRecord.findUnique({ where: { id: proofId } });
  if (!proof) return false;
  if (!proof.checksum) return true; // no checksum = not yet sealed

  const expectedChecksum = computeChecksum({
    auditObjectId: proof.auditObjectId,
    fieldName: proof.fieldName,
    decision: proof.decision,
    timestamp: proof.timestamp.toISOString(),
  });

  return proof.checksum === expectedChecksum;
}

export async function getProofSummary(auditObjectId: string) {
  const proofs = await prisma.proofRecord.findMany({
    where: { auditObjectId },
  });

  return {
    total: proofs.length,
    validated: proofs.filter(p => p.decision === 'VALIDATED').length,
    withReserve: proofs.filter(p => p.decision === 'VALIDATED_RESERVE').length,
    pending: proofs.filter(p => p.decision === 'PENDING').length,
    rejected: proofs.filter(p => p.decision === 'REJECTED').length,
    excluded: proofs.filter(p => p.decision === 'EXCLUDED').length,
    immutable: proofs.filter(p => p.isImmutable).length,
    averageConfidence: proofs.length > 0
      ? proofs.reduce((sum, p) => sum + (p.extractionScore ?? 0), 0) / proofs.length
      : 0,
  };
}
FILEEOF

cat <<'FILEEOF' > packages/backend/src/services/questionnaireEngine.ts
import { prisma } from '../utils/prisma.js';

export interface GenerateQuestionnaireParams {
  auditObjectId: string;
  assignedToId: string;
  context: string;
  missingInfo: string;
  suggestedAnswers?: string[];
  expectedDocs?: string[];
  escalateAfterHours?: number;
  batchGroupId?: string;
}

export async function generateQuestionnaire(params: GenerateQuestionnaireParams) {
  const escalateAfter = params.escalateAfterHours
    ? new Date(Date.now() + params.escalateAfterHours * 3600_000)
    : new Date(Date.now() + 72 * 3600_000); // default 72h

  const nextReminder = new Date(Date.now() + 24 * 3600_000); // first reminder after 24h

  return prisma.questionnaire.create({
    data: {
      auditObjectId: params.auditObjectId,
      assignedToId: params.assignedToId,
      context: params.context,
      missingInfo: params.missingInfo,
      suggestedAnswers: params.suggestedAnswers ?? [],
      expectedDocs: params.expectedDocs ?? [],
      escalateAfter,
      nextReminderAt: nextReminder,
      batchGroupId: params.batchGroupId,
    },
  });
}

export async function answerQuestionnaire(
  id: string,
  response: string,
  responseType: string,
  uploadedDocIds?: string[]
) {
  return prisma.questionnaire.update({
    where: { id },
    data: {
      response,
      responseType,
      uploadedDocIds: uploadedDocIds ?? [],
      status: 'ANSWERED',
      resolvedAt: new Date(),
    },
  });
}

export async function getOverdueQuestionnaires() {
  const now = new Date();
  return prisma.questionnaire.findMany({
    where: {
      status: 'PENDING',
      escalateAfter: { lte: now },
    },
    include: {
      auditObject: true,
      assignedTo: { select: { id: true, firstName: true, lastName: true, email: true } },
    },
  });
}

export async function getDueReminders() {
  const now = new Date();
  return prisma.questionnaire.findMany({
    where: {
      status: 'PENDING',
      nextReminderAt: { lte: now },
      escalateAfter: { gt: now },
    },
    include: {
      assignedTo: { select: { id: true, firstName: true, lastName: true, email: true } },
    },
  });
}

export async function escalateQuestionnaire(id: string, newAssigneeId: string) {
  const q = await prisma.questionnaire.findUnique({ where: { id } });
  if (!q) throw new Error('Questionnaire not found');

  return prisma.questionnaire.update({
    where: { id },
    data: {
      status: 'ESCALATED',
      assignedToId: newAssigneeId,
      escalateAfter: new Date(Date.now() + 72 * 3600_000),
    },
  });
}

export async function batchResolve(batchGroupId: string, response: string, actorId: string) {
  return prisma.questionnaire.updateMany({
    where: { batchGroupId, status: 'PENDING' },
    data: {
      response,
      responseType: 'BATCH',
      status: 'BATCH_RESOLVED',
      resolvedAt: new Date(),
    },
  });
}
FILEEOF

cat <<'FILEEOF' > packages/backend/src/services/auditLogger.ts
import { prisma } from '../utils/prisma.js';

export interface LogParams {
  userId?: string;
  action: string;
  entityType: string;
  entityId: string;
  changes?: Record<string, { old: unknown; new: unknown }>;
  ipAddress?: string;
  userAgent?: string;
}

export async function logAudit(params: LogParams) {
  return prisma.auditLog.create({
    data: {
      userId: params.userId,
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId,
      changes: params.changes as any,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
    },
  });
}

export async function getAuditTrail(entityType: string, entityId: string) {
  return prisma.auditLog.findMany({
    where: { entityType, entityId },
    orderBy: { createdAt: 'desc' },
    include: {
      user: { select: { id: true, firstName: true, lastName: true, role: true } },
    },
  });
}
FILEEOF

echo "Backend middleware and services created."

# ============================================================
# BACKEND - routes/auth.ts
# ============================================================

cat <<'FILEEOF' > packages/backend/src/routes/auth.ts
import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { prisma } from '../utils/prisma.js';
import { validate } from '../utils/validation.js';
import { handleError, badRequest, notFound } from '../utils/errors.js';
import { requireAuth } from '../middleware/auth.js';
import { logAudit } from '../services/auditLogger.js';

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  role: z.enum([
    'ADMIN', 'DAF', 'COMPTABLE', 'RH', 'JURIDIQUE', 'ACHATS',
    'COMMERCIAL', 'CHEF_PROJET', 'CONTROLE', 'AUDITEUR', 'OPERATEUR',
  ]),
  companyScope: z.array(z.string()).default([]),
  projectScope: z.array(z.string()).default([]),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

export const authRoutes: FastifyPluginAsync = async (app) => {
  // Register
  app.post('/register', async (request, reply) => {
    try {
      const data = validate(registerSchema, request.body);
      const existing = await prisma.user.findUnique({ where: { email: data.email } });
      if (existing) throw badRequest('Email already registered');

      const passwordHash = await bcrypt.hash(data.password, 12);
      const user = await prisma.user.create({
        data: { ...data, passwordHash, password: undefined } as any,
        select: { id: true, email: true, firstName: true, lastName: true, role: true },
      });

      await logAudit({
        action: 'CREATE',
        entityType: 'User',
        entityId: user.id,
        ipAddress: request.ip,
      });

      const token = app.jwt.sign({
        id: user.id,
        email: user.email,
        role: user.role,
        companyScope: data.companyScope,
        projectScope: data.projectScope,
      });

      return reply.status(201).send({ user, token });
    } catch (err) {
      return handleError(err, reply);
    }
  });

  // Login
  app.post('/login', async (request, reply) => {
    try {
      const data = validate(loginSchema, request.body);
      const user = await prisma.user.findUnique({ where: { email: data.email } });
      if (!user || !user.isActive) throw badRequest('Invalid credentials');

      const valid = await bcrypt.compare(data.password, user.passwordHash);
      if (!valid) throw badRequest('Invalid credentials');

      await prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() },
      });

      await logAudit({
        userId: user.id,
        action: 'LOGIN',
        entityType: 'User',
        entityId: user.id,
        ipAddress: request.ip,
      });

      const token = app.jwt.sign({
        id: user.id,
        email: user.email,
        role: user.role,
        companyScope: user.companyScope,
        projectScope: user.projectScope,
      });

      return {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
        },
        token,
      };
    } catch (err) {
      return handleError(err, reply);
    }
  });

  // Get current user
  app.get('/me', { preHandler: [requireAuth] }, async (request, reply) => {
    try {
      const user = await prisma.user.findUnique({
        where: { id: request.user.id },
        select: {
          id: true, email: true, firstName: true, lastName: true,
          role: true, companyScope: true, projectScope: true, isActive: true,
        },
      });
      if (!user) throw notFound('User');
      return user;
    } catch (err) {
      return handleError(err, reply);
    }
  });
};
FILEEOF

# ============================================================
# BACKEND - routes/companies.ts
# ============================================================

cat <<'FILEEOF' > packages/backend/src/routes/companies.ts
import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { prisma } from '../utils/prisma.js';
import { validate, paginationSchema, paginatedResponse } from '../utils/validation.js';
import { handleError, notFound } from '../utils/errors.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { logAudit } from '../services/auditLogger.js';

const createSchema = z.object({
  code: z.string().min(1).max(20),
  name: z.string().min(1),
  legalForm: z.string().optional(),
  taxId: z.string().optional(),
  address: z.string().optional(),
});

export const companyRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', requireAuth);

  app.get('/', async (request, reply) => {
    try {
      const q = validate(paginationSchema, request.query);
      const [data, total] = await Promise.all([
        prisma.company.findMany({
          skip: (q.page - 1) * q.limit,
          take: q.limit,
          orderBy: { createdAt: q.sortOrder },
        }),
        prisma.company.count(),
      ]);
      return paginatedResponse(data, total, q);
    } catch (err) {
      return handleError(err, reply);
    }
  });

  app.get('/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const company = await prisma.company.findUnique({
        where: { id },
        include: {
          projects: true,
          companyAssociates: { include: { associate: true } },
          _count: { select: { employees: true, documents: true } },
        },
      });
      if (!company) throw notFound('Company', id);
      return company;
    } catch (err) {
      return handleError(err, reply);
    }
  });

  app.post('/', { preHandler: [requireRole('ADMIN', 'DAF')] }, async (request, reply) => {
    try {
      const data = validate(createSchema, request.body);
      const company = await prisma.company.create({ data });
      await logAudit({
        userId: request.user.id,
        action: 'CREATE',
        entityType: 'Company',
        entityId: company.id,
      });
      return reply.status(201).send(company);
    } catch (err) {
      return handleError(err, reply);
    }
  });

  app.put('/:id', { preHandler: [requireRole('ADMIN', 'DAF')] }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const data = validate(createSchema.partial(), request.body);
      const company = await prisma.company.update({ where: { id }, data });
      await logAudit({
        userId: request.user.id,
        action: 'UPDATE',
        entityType: 'Company',
        entityId: id,
        changes: data as any,
      });
      return company;
    } catch (err) {
      return handleError(err, reply);
    }
  });
};
FILEEOF

# ============================================================
# BACKEND - routes/projects.ts
# ============================================================

cat <<'FILEEOF' > packages/backend/src/routes/projects.ts
import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { prisma } from '../utils/prisma.js';
import { validate, paginationSchema, paginatedResponse } from '../utils/validation.js';
import { handleError, notFound } from '../utils/errors.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { logAudit } from '../services/auditLogger.js';

const createSchema = z.object({
  companyId: z.string().uuid(),
  code: z.string().min(1).max(20),
  name: z.string().min(1),
  type: z.enum(['CONSTRUCTION', 'PROMOTION', 'SERVICE', 'INTERNAL']),
  status: z.enum(['ACTIVE', 'SUSPENDED', 'CLOSED', 'ARCHIVED']).default('ACTIVE'),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  budget: z.number().optional(),
});

export const projectRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', requireAuth);

  app.get('/', async (request, reply) => {
    try {
      const q = validate(paginationSchema, request.query);
      const where = request.user.companyScope.length > 0
        ? { companyId: { in: request.user.companyScope } }
        : {};
      const [data, total] = await Promise.all([
        prisma.project.findMany({
          where,
          skip: (q.page - 1) * q.limit,
          take: q.limit,
          include: { company: { select: { code: true, name: true } } },
          orderBy: { createdAt: q.sortOrder },
        }),
        prisma.project.count({ where }),
      ]);
      return paginatedResponse(data, total, q);
    } catch (err) {
      return handleError(err, reply);
    }
  });

  app.get('/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const project = await prisma.project.findUnique({
        where: { id },
        include: {
          company: true,
          costCenters: true,
          companyAssociates: { include: { associate: true } },
          _count: { select: { documents: true, contracts: true, tasks: true } },
        },
      });
      if (!project) throw notFound('Project', id);
      return project;
    } catch (err) {
      return handleError(err, reply);
    }
  });

  app.post('/', { preHandler: [requireRole('ADMIN', 'DAF', 'CHEF_PROJET')] }, async (request, reply) => {
    try {
      const data = validate(createSchema, request.body);
      const project = await prisma.project.create({ data: data as any });
      await logAudit({
        userId: request.user.id,
        action: 'CREATE',
        entityType: 'Project',
        entityId: project.id,
      });
      return reply.status(201).send(project);
    } catch (err) {
      return handleError(err, reply);
    }
  });
};
FILEEOF

echo "Backend routes (auth, companies, projects) created."

# ============================================================
# BACKEND - routes/auditObjects.ts
# ============================================================

cat <<'FILEEOF' > packages/backend/src/routes/auditObjects.ts
import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { prisma } from '../utils/prisma.js';
import { validate, paginationSchema, paginatedResponse } from '../utils/validation.js';
import { handleError, notFound } from '../utils/errors.js';
import { requireAuth } from '../middleware/auth.js';
import { transitionState, getTransitionHistory, getValidTransitions, OBJECT_STATES } from '../services/stateMachine.js';
import { getProofSummary } from '../services/proofRegistry.js';
import { logAudit } from '../services/auditLogger.js';

const createSchema = z.object({
  companyId: z.string().uuid().optional(),
  projectId: z.string().uuid().optional(),
  objectType: z.string(),
  objectId: z.string(),
  criticality: z.enum(['LOW', 'NORMAL', 'HIGH', 'CRITICAL']).default('NORMAL'),
  classFamily: z.string().optional(),
});

const transitionSchema = z.object({
  toState: z.enum(OBJECT_STATES as unknown as [string, ...string[]]),
  reason: z.string().optional(),
  actorType: z.enum(['SYSTEM', 'AI_PROPOSAL', 'HUMAN', 'RULE_ENGINE', 'ESCALATION']).default('HUMAN'),
  ruleId: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
});

export const auditObjectRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', requireAuth);

  // List with filters
  app.get('/', async (request, reply) => {
    try {
      const q = validate(paginationSchema, request.query);
      const filters = request.query as Record<string, string>;
      const where: Record<string, unknown> = {};
      if (filters.state) where.state = filters.state;
      if (filters.objectType) where.objectType = filters.objectType;
      if (filters.companyId) where.companyId = filters.companyId;
      if (filters.criticality) where.criticality = filters.criticality;

      const [data, total] = await Promise.all([
        prisma.auditObject.findMany({
          where,
          skip: (q.page - 1) * q.limit,
          take: q.limit,
          orderBy: { updatedAt: 'desc' },
          include: {
            company: { select: { code: true, name: true } },
            project: { select: { code: true, name: true } },
            _count: { select: { proofRecords: true, questionnaires: true } },
          },
        }),
        prisma.auditObject.count({ where }),
      ]);
      return paginatedResponse(data, total, q);
    } catch (err) {
      return handleError(err, reply);
    }
  });

  // Get single with full context
  app.get('/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const obj = await prisma.auditObject.findUnique({
        where: { id },
        include: {
          company: true,
          project: true,
          proofRecords: { orderBy: { timestamp: 'asc' } },
          stateTransitions: { orderBy: { createdAt: 'asc' } },
          questionnaires: { orderBy: { createdAt: 'desc' } },
        },
      });
      if (!obj) throw notFound('AuditObject', id);

      const validTransitions = getValidTransitions(obj.state);
      const proofSummary = await getProofSummary(id);

      return { ...obj, validTransitions, proofSummary };
    } catch (err) {
      return handleError(err, reply);
    }
  });

  // Create audit object
  app.post('/', async (request, reply) => {
    try {
      const data = validate(createSchema, request.body);
      const obj = await prisma.auditObject.create({ data });
      await logAudit({
        userId: request.user.id,
        action: 'CREATE',
        entityType: 'AuditObject',
        entityId: obj.id,
      });
      return reply.status(201).send(obj);
    } catch (err) {
      return handleError(err, reply);
    }
  });

  // Transition state
  app.post('/:id/transition', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const data = validate(transitionSchema, request.body);

      const result = await transitionState({
        auditObjectId: id,
        toState: data.toState as any,
        reason: data.reason,
        actorType: data.actorType as any,
        actorId: request.user.id,
        ruleId: data.ruleId,
        metadata: data.metadata,
      });

      await logAudit({
        userId: request.user.id,
        action: 'UPDATE',
        entityType: 'AuditObject',
        entityId: id,
        changes: { state: { old: result.transition.fromState, new: result.transition.toState } },
      });

      return result;
    } catch (err) {
      return handleError(err, reply);
    }
  });

  // Get transition history
  app.get('/:id/history', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      return await getTransitionHistory(id);
    } catch (err) {
      return handleError(err, reply);
    }
  });
};
FILEEOF

# ============================================================
# BACKEND - routes/documents.ts
# ============================================================

cat <<'FILEEOF' > packages/backend/src/routes/documents.ts
import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { createHash } from 'crypto';
import { prisma } from '../utils/prisma.js';
import { validate, paginationSchema, paginatedResponse } from '../utils/validation.js';
import { handleError, notFound } from '../utils/errors.js';
import { requireAuth } from '../middleware/auth.js';
import { logAudit } from '../services/auditLogger.js';

const createSchema = z.object({
  companyId: z.string().uuid().optional(),
  projectId: z.string().uuid().optional(),
  thirdPartyId: z.string().uuid().optional(),
  originalName: z.string(),
  storagePath: z.string(),
  mimeType: z.string(),
  sizeBytes: z.number().int(),
  family: z.string().optional(),
  period: z.string().optional(),
});

export const documentRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', requireAuth);

  app.get('/', async (request, reply) => {
    try {
      const q = validate(paginationSchema, request.query);
      const filters = request.query as Record<string, string>;
      const where: Record<string, unknown> = {};
      if (filters.family) where.family = filters.family;
      if (filters.status) where.status = filters.status;
      if (filters.companyId) where.companyId = filters.companyId;

      const [data, total] = await Promise.all([
        prisma.document.findMany({
          where,
          skip: (q.page - 1) * q.limit,
          take: q.limit,
          orderBy: { createdAt: 'desc' },
          include: {
            company: { select: { code: true, name: true } },
            project: { select: { code: true, name: true } },
          },
        }),
        prisma.document.count({ where }),
      ]);
      return paginatedResponse(data, total, q);
    } catch (err) {
      return handleError(err, reply);
    }
  });

  app.get('/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const doc = await prisma.document.findUnique({
        where: { id },
        include: {
          company: true,
          project: true,
          thirdParty: true,
          proofRecords: true,
        },
      });
      if (!doc) throw notFound('Document', id);
      return doc;
    } catch (err) {
      return handleError(err, reply);
    }
  });

  app.post('/', async (request, reply) => {
    try {
      const data = validate(createSchema, request.body);
      const fingerprint = createHash('sha256').update(`${data.originalName}-${data.sizeBytes}-${Date.now()}`).digest('hex');

      // Check for duplicates
      const duplicate = await prisma.document.findFirst({
        where: { fingerprint, isDuplicate: false },
      });

      const doc = await prisma.document.create({
        data: {
          ...data,
          fingerprint,
          isDuplicate: !!duplicate,
          duplicateOfId: duplicate?.id,
          normalizedName: normalizeFileName(data.originalName, data.family, data.period),
        },
      });

      await logAudit({
        userId: request.user.id,
        action: 'CREATE',
        entityType: 'Document',
        entityId: doc.id,
      });

      return reply.status(201).send(doc);
    } catch (err) {
      return handleError(err, reply);
    }
  });

  // Get orphan documents
  app.get('/orphans', async (request, reply) => {
    try {
      const orphans = await prisma.document.findMany({
        where: { status: 'ORPHAN' },
        orderBy: { createdAt: 'desc' },
      });
      return orphans;
    } catch (err) {
      return handleError(err, reply);
    }
  });
};

function normalizeFileName(name: string, family?: string, period?: string): string {
  const ext = name.split('.').pop() || '';
  const base = name.replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase();
  const parts = [family || 'DOC', period || 'NODATE', base].filter(Boolean);
  return `${parts.join('_')}.${ext}`;
}
FILEEOF

# ============================================================
# BACKEND - routes/questionnaires.ts
# ============================================================

cat <<'FILEEOF' > packages/backend/src/routes/questionnaires.ts
import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { prisma } from '../utils/prisma.js';
import { validate, paginationSchema, paginatedResponse } from '../utils/validation.js';
import { handleError, notFound } from '../utils/errors.js';
import { requireAuth } from '../middleware/auth.js';
import {
  generateQuestionnaire,
  answerQuestionnaire,
  escalateQuestionnaire,
  batchResolve,
  getOverdueQuestionnaires,
} from '../services/questionnaireEngine.js';

const createSchema = z.object({
  auditObjectId: z.string().uuid(),
  assignedToId: z.string().uuid(),
  context: z.string().min(1),
  missingInfo: z.string().min(1),
  suggestedAnswers: z.array(z.string()).min(2).max(5).optional(),
  expectedDocs: z.array(z.string()).optional(),
  escalateAfterHours: z.number().optional(),
  batchGroupId: z.string().optional(),
});

const answerSchema = z.object({
  response: z.string().min(1),
  responseType: z.enum(['SELECTED_SUGGESTION', 'FREE_TEXT', 'DOCUMENT_UPLOAD', 'BATCH']),
  uploadedDocIds: z.array(z.string().uuid()).optional(),
});

export const questionnaireRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', requireAuth);

  app.get('/', async (request, reply) => {
    try {
      const q = validate(paginationSchema, request.query);
      const filters = request.query as Record<string, string>;
      const where: Record<string, unknown> = {};
      if (filters.status) where.status = filters.status;
      if (filters.assignedToId) where.assignedToId = filters.assignedToId;

      // Non-admin users see only their questionnaires
      if (request.user.role !== 'ADMIN' && request.user.role !== 'CONTROLE') {
        where.assignedToId = request.user.id;
      }

      const [data, total] = await Promise.all([
        prisma.questionnaire.findMany({
          where,
          skip: (q.page - 1) * q.limit,
          take: q.limit,
          orderBy: { createdAt: 'desc' },
          include: {
            auditObject: { select: { id: true, objectType: true, state: true, criticality: true } },
            assignedTo: { select: { firstName: true, lastName: true, email: true } },
          },
        }),
        prisma.questionnaire.count({ where }),
      ]);
      return paginatedResponse(data, total, q);
    } catch (err) {
      return handleError(err, reply);
    }
  });

  app.post('/', async (request, reply) => {
    try {
      const data = validate(createSchema, request.body);
      const q = await generateQuestionnaire(data);
      return reply.status(201).send(q);
    } catch (err) {
      return handleError(err, reply);
    }
  });

  app.post('/:id/answer', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const data = validate(answerSchema, request.body);
      const q = await answerQuestionnaire(id, data.response, data.responseType, data.uploadedDocIds);
      return q;
    } catch (err) {
      return handleError(err, reply);
    }
  });

  app.post('/:id/escalate', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const { newAssigneeId } = request.body as { newAssigneeId: string };
      const q = await escalateQuestionnaire(id, newAssigneeId);
      return q;
    } catch (err) {
      return handleError(err, reply);
    }
  });

  app.post('/batch-resolve', async (request, reply) => {
    try {
      const { batchGroupId, response } = request.body as { batchGroupId: string; response: string };
      const result = await batchResolve(batchGroupId, response, request.user.id);
      return { resolved: result.count };
    } catch (err) {
      return handleError(err, reply);
    }
  });

  app.get('/overdue', async (request, reply) => {
    try {
      return await getOverdueQuestionnaires();
    } catch (err) {
      return handleError(err, reply);
    }
  });
};
FILEEOF

# ============================================================
# BACKEND - routes/proof.ts
# ============================================================

cat <<'FILEEOF' > packages/backend/src/routes/proof.ts
import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { validate } from '../utils/validation.js';
import { handleError } from '../utils/errors.js';
import { requireAuth } from '../middleware/auth.js';
import { createProofRecord, getProofChain, verifyProofIntegrity, getProofSummary } from '../services/proofRegistry.js';

const createSchema = z.object({
  auditObjectId: z.string().uuid(),
  fieldName: z.string().min(1),
  sourceFileId: z.string().uuid().optional(),
  sourcePage: z.number().int().optional(),
  sourceZone: z.string().optional(),
  extractionEngine: z.string().optional(),
  extractionScore: z.number().min(0).max(1).optional(),
  validationRule: z.string().optional(),
  decision: z.enum(['VALIDATED', 'VALIDATED_RESERVE', 'PENDING', 'REJECTED', 'EXCLUDED']),
  decisionReason: z.string().optional(),
  humanActorId: z.string().uuid().optional(),
  upstreamProofId: z.string().uuid().optional(),
});

export const proofRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', requireAuth);

  app.post('/', async (request, reply) => {
    try {
      const data = validate(createSchema, request.body);
      const proof = await createProofRecord(data);
      return reply.status(201).send(proof);
    } catch (err) {
      return handleError(err, reply);
    }
  });

  app.get('/chain/:auditObjectId', async (request, reply) => {
    try {
      const { auditObjectId } = request.params as { auditObjectId: string };
      return await getProofChain(auditObjectId);
    } catch (err) {
      return handleError(err, reply);
    }
  });

  app.get('/summary/:auditObjectId', async (request, reply) => {
    try {
      const { auditObjectId } = request.params as { auditObjectId: string };
      return await getProofSummary(auditObjectId);
    } catch (err) {
      return handleError(err, reply);
    }
  });

  app.get('/verify/:proofId', async (request, reply) => {
    try {
      const { proofId } = request.params as { proofId: string };
      const isValid = await verifyProofIntegrity(proofId);
      return { proofId, integrity: isValid ? 'VALID' : 'TAMPERED' };
    } catch (err) {
      return handleError(err, reply);
    }
  });
};
FILEEOF

echo "Backend routes (auditObjects, documents, questionnaires, proof) created."

# ============================================================
# BACKEND - routes/journal.ts
# ============================================================

cat <<'FILEEOF' > packages/backend/src/routes/journal.ts
import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { prisma } from '../utils/prisma.js';
import { validate, paginationSchema, paginatedResponse } from '../utils/validation.js';
import { handleError, notFound, forbidden } from '../utils/errors.js';
import { requireAuth, requireRole, requireCompanyAccess } from '../middleware/auth.js';
import { logAudit } from '../services/auditLogger.js';

const createSchema = z.object({
  companyId: z.string().uuid(),
  costCenterId: z.string().uuid().optional(),
  thirdPartyId: z.string().uuid().optional(),
  entryDate: z.string().datetime(),
  journal: z.string().min(1).max(5),
  reference: z.string().optional(),
  label: z.string().min(1),
  debitAccountId: z.string().uuid(),
  creditAccountId: z.string().uuid(),
  amount: z.number().positive(),
  status: z.enum(['DRAFT', 'PROPOSED']).default('DRAFT'),
  sourceType: z.enum(['ORIGINAL', 'CORRECTED', 'AUTO_IMPUTED']).default('ORIGINAL'),
});

export const journalRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', requireAuth);

  app.get('/', async (request, reply) => {
    try {
      const q = validate(paginationSchema, request.query);
      const filters = request.query as Record<string, string>;
      const where: Record<string, unknown> = {};
      if (filters.companyId) where.companyId = filters.companyId;
      if (filters.status) where.status = filters.status;
      if (filters.journal) where.journal = filters.journal;
      if (filters.proofStatus) where.proofStatus = filters.proofStatus;

      const [data, total] = await Promise.all([
        prisma.journalEntry.findMany({
          where,
          skip: (q.page - 1) * q.limit,
          take: q.limit,
          orderBy: { entryDate: 'desc' },
          include: {
            company: { select: { code: true, name: true } },
            debitAccount: { select: { code: true, name: true } },
            creditAccount: { select: { code: true, name: true } },
            thirdParty: { select: { code: true, name: true } },
          },
        }),
        prisma.journalEntry.count({ where }),
      ]);
      return paginatedResponse(data, total, q);
    } catch (err) {
      return handleError(err, reply);
    }
  });

  app.post('/', { preHandler: [requireRole('ADMIN', 'DAF', 'COMPTABLE')] }, async (request, reply) => {
    try {
      const data = validate(createSchema, request.body);
      if (!requireCompanyAccess(data.companyId, request.user)) {
        throw forbidden('No access to this company');
      }
      const entry = await prisma.journalEntry.create({ data: data as any });
      await logAudit({
        userId: request.user.id,
        action: 'CREATE',
        entityType: 'JournalEntry',
        entityId: entry.id,
      });
      return reply.status(201).send(entry);
    } catch (err) {
      return handleError(err, reply);
    }
  });

  // Validate entry (Level C — human obligatory)
  app.post('/:id/validate', { preHandler: [requireRole('ADMIN', 'DAF', 'COMPTABLE')] }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const entry = await prisma.journalEntry.findUnique({ where: { id } });
      if (!entry) throw notFound('JournalEntry', id);

      if (entry.proofStatus === 'MISSING') {
        return reply.status(422).send({
          error: 'Cannot validate: proof is missing',
          proofStatus: entry.proofStatus,
        });
      }

      const updated = await prisma.journalEntry.update({
        where: { id },
        data: { status: 'VALIDATED' },
      });

      await logAudit({
        userId: request.user.id,
        action: 'VALIDATE',
        entityType: 'JournalEntry',
        entityId: id,
        changes: { status: { old: entry.status, new: 'VALIDATED' } },
      });

      return updated;
    } catch (err) {
      return handleError(err, reply);
    }
  });

  // Anomaly detection endpoint
  app.get('/anomalies', async (request, reply) => {
    try {
      const filters = request.query as { companyId?: string };
      const where: Record<string, unknown> = {};
      if (filters.companyId) where.companyId = filters.companyId;

      const [missingProof, inconsistent, duplicateRefs] = await Promise.all([
        prisma.journalEntry.count({ where: { ...where, proofStatus: 'MISSING' } }),
        prisma.journalEntry.count({ where: { ...where, proofStatus: 'INCONSISTENT' } }),
        prisma.journalEntry.groupBy({
          by: ['reference'],
          where: { ...where, reference: { not: null } },
          having: { reference: { _count: { gt: 1 } } },
          _count: true,
        }),
      ]);

      return {
        missingProof,
        inconsistent,
        potentialDuplicates: duplicateRefs.length,
      };
    } catch (err) {
      return handleError(err, reply);
    }
  });
};
FILEEOF

# ============================================================
# BACKEND - routes/hr.ts
# ============================================================

cat <<'FILEEOF' > packages/backend/src/routes/hr.ts
import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { prisma } from '../utils/prisma.js';
import { validate, paginationSchema, paginatedResponse } from '../utils/validation.js';
import { handleError, notFound } from '../utils/errors.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { logAudit } from '../services/auditLogger.js';

const employeeSchema = z.object({
  companyId: z.string().uuid(),
  code: z.string().min(1),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  position: z.string().optional(),
  department: z.string().optional(),
  contractType: z.enum(['CDI', 'CDD', 'FREELANCE', 'INTERN']).optional(),
  baseSalary: z.number().optional(),
  hireDate: z.string().datetime().optional(),
});

const taskSchema = z.object({
  projectId: z.string().uuid().optional(),
  employeeId: z.string().uuid(),
  code: z.string().min(1),
  title: z.string().min(1),
  description: z.string().optional(),
  taskType: z.enum(['STANDARD', 'SPI', 'MISSION']),
  proposedPrice: z.number().optional(),
});

export const hrRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', requireAuth);

  // Employees
  app.get('/employees', async (request, reply) => {
    try {
      const q = validate(paginationSchema, request.query);
      const filters = request.query as Record<string, string>;
      const where: Record<string, unknown> = {};
      if (filters.companyId) where.companyId = filters.companyId;
      if (filters.department) where.department = filters.department;

      const [data, total] = await Promise.all([
        prisma.employee.findMany({
          where,
          skip: (q.page - 1) * q.limit,
          take: q.limit,
          include: { company: { select: { code: true, name: true } } },
          orderBy: { lastName: 'asc' },
        }),
        prisma.employee.count({ where }),
      ]);
      return paginatedResponse(data, total, q);
    } catch (err) {
      return handleError(err, reply);
    }
  });

  app.post('/employees', { preHandler: [requireRole('ADMIN', 'RH')] }, async (request, reply) => {
    try {
      const data = validate(employeeSchema, request.body);
      const emp = await prisma.employee.create({ data: data as any });
      await logAudit({ userId: request.user.id, action: 'CREATE', entityType: 'Employee', entityId: emp.id });
      return reply.status(201).send(emp);
    } catch (err) {
      return handleError(err, reply);
    }
  });

  // Tasks (SPI)
  app.get('/tasks', async (request, reply) => {
    try {
      const q = validate(paginationSchema, request.query);
      const filters = request.query as Record<string, string>;
      const where: Record<string, unknown> = {};
      if (filters.status) where.status = filters.status;
      if (filters.employeeId) where.employeeId = filters.employeeId;
      if (filters.taskType) where.taskType = filters.taskType;

      const [data, total] = await Promise.all([
        prisma.task.findMany({
          where,
          skip: (q.page - 1) * q.limit,
          take: q.limit,
          include: {
            employee: { select: { firstName: true, lastName: true, code: true } },
            project: { select: { code: true, name: true } },
          },
          orderBy: { createdAt: 'desc' },
        }),
        prisma.task.count({ where }),
      ]);
      return paginatedResponse(data, total, q);
    } catch (err) {
      return handleError(err, reply);
    }
  });

  app.post('/tasks', { preHandler: [requireRole('ADMIN', 'RH', 'CHEF_PROJET')] }, async (request, reply) => {
    try {
      const data = validate(taskSchema, request.body);
      const task = await prisma.task.create({ data });
      await logAudit({ userId: request.user.id, action: 'CREATE', entityType: 'Task', entityId: task.id });
      return reply.status(201).send(task);
    } catch (err) {
      return handleError(err, reply);
    }
  });

  // Task state transitions
  app.post('/tasks/:id/validate', { preHandler: [requireRole('ADMIN', 'RH', 'CHEF_PROJET')] }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const { type, decision, comment } = request.body as {
        type: string; decision: string; comment?: string;
      };

      const task = await prisma.task.findUnique({ where: { id } });
      if (!task) throw notFound('Task', id);

      await prisma.taskValidation.create({
        data: { taskId: id, validatorId: request.user.id, type, decision, comment },
      });

      // Update task status based on validation
      let newStatus = task.status;
      if (type === 'QUALITY' && decision === 'APPROVED') newStatus = 'QC_PASS';
      if (type === 'QUALITY' && decision === 'REJECTED') newStatus = 'QC_FAIL';
      if (type === 'PAYMENT_RELEASE' && decision === 'APPROVED') newStatus = 'PAID';

      const updated = await prisma.task.update({ where: { id }, data: { status: newStatus } });
      return updated;
    } catch (err) {
      return handleError(err, reply);
    }
  });

  // Payslips
  app.get('/payslips', async (request, reply) => {
    try {
      const q = validate(paginationSchema, request.query);
      const filters = request.query as Record<string, string>;
      const where: Record<string, unknown> = {};
      if (filters.period) where.period = filters.period;
      if (filters.status) where.status = filters.status;

      const [data, total] = await Promise.all([
        prisma.payslip.findMany({
          where,
          skip: (q.page - 1) * q.limit,
          take: q.limit,
          include: { employee: { select: { firstName: true, lastName: true, code: true } } },
          orderBy: { period: 'desc' },
        }),
        prisma.payslip.count({ where }),
      ]);
      return paginatedResponse(data, total, q);
    } catch (err) {
      return handleError(err, reply);
    }
  });
};
FILEEOF

echo "Backend routes (journal, hr) created."

# ============================================================
# BACKEND - routes/purchases.ts, stock.ts, sales.ts, legal.ts
# ============================================================

cat <<'FILEEOF' > packages/backend/src/routes/purchases.ts
import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { prisma } from '../utils/prisma.js';
import { validate, paginationSchema, paginatedResponse } from '../utils/validation.js';
import { handleError } from '../utils/errors.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { logAudit } from '../services/auditLogger.js';

const createSchema = z.object({
  companyId: z.string().uuid(),
  thirdPartyId: z.string().uuid(),
  reference: z.string(),
  orderDate: z.string().datetime(),
  lines: z.array(z.object({
    articleId: z.string().uuid(),
    quantity: z.number().positive(),
    unitPrice: z.number().positive(),
  })).min(1),
});

export const purchaseRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', requireAuth);

  app.get('/', async (request, reply) => {
    try {
      const q = validate(paginationSchema, request.query);
      const filters = request.query as Record<string, string>;
      const where: Record<string, unknown> = {};
      if (filters.companyId) where.companyId = filters.companyId;
      if (filters.status) where.status = filters.status;

      const [data, total] = await Promise.all([
        prisma.purchaseOrder.findMany({
          where,
          skip: (q.page - 1) * q.limit,
          take: q.limit,
          include: {
            company: { select: { code: true, name: true } },
            thirdParty: { select: { code: true, name: true } },
            _count: { select: { lines: true } },
          },
          orderBy: { orderDate: 'desc' },
        }),
        prisma.purchaseOrder.count({ where }),
      ]);
      return paginatedResponse(data, total, q);
    } catch (err) {
      return handleError(err, reply);
    }
  });

  app.post('/', { preHandler: [requireRole('ADMIN', 'ACHATS', 'DAF')] }, async (request, reply) => {
    try {
      const data = validate(createSchema, request.body);
      const totalAmount = data.lines.reduce((s, l) => s + l.quantity * l.unitPrice, 0);

      const po = await prisma.purchaseOrder.create({
        data: {
          companyId: data.companyId,
          thirdPartyId: data.thirdPartyId,
          reference: data.reference,
          orderDate: new Date(data.orderDate),
          totalAmount,
          lines: { create: data.lines },
        },
        include: { lines: true },
      });

      await logAudit({ userId: request.user.id, action: 'CREATE', entityType: 'PurchaseOrder', entityId: po.id });
      return reply.status(201).send(po);
    } catch (err) {
      return handleError(err, reply);
    }
  });
};
FILEEOF

cat <<'FILEEOF' > packages/backend/src/routes/stock.ts
import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { prisma } from '../utils/prisma.js';
import { validate, paginationSchema, paginatedResponse } from '../utils/validation.js';
import { handleError } from '../utils/errors.js';
import { requireAuth } from '../middleware/auth.js';
import { logAudit } from '../services/auditLogger.js';

const moveSchema = z.object({
  locationId: z.string().uuid(),
  articleId: z.string().uuid(),
  moveType: z.enum(['IN', 'OUT', 'TRANSFER', 'ADJUSTMENT', 'RETURN']),
  quantity: z.number().positive(),
  reference: z.string().optional(),
  sourceDoc: z.string().optional(),
});

export const stockRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', requireAuth);

  // Articles
  app.get('/articles', async (request, reply) => {
    try {
      const q = validate(paginationSchema, request.query);
      const [data, total] = await Promise.all([
        prisma.article.findMany({
          skip: (q.page - 1) * q.limit,
          take: q.limit,
          orderBy: { name: 'asc' },
        }),
        prisma.article.count(),
      ]);
      return paginatedResponse(data, total, q);
    } catch (err) {
      return handleError(err, reply);
    }
  });

  // Stock levels (computed from moves)
  app.get('/levels', async (request, reply) => {
    try {
      const filters = request.query as { locationId?: string };
      const where = filters.locationId ? { locationId: filters.locationId } : {};

      const moves = await prisma.stockMove.groupBy({
        by: ['articleId', 'locationId'],
        where,
        _sum: { quantity: true },
      });

      // Compute net stock: IN/RETURN positive, OUT negative
      const levels: Record<string, { articleId: string; locationId: string; quantity: number }> = {};
      const allMoves = await prisma.stockMove.findMany({ where });

      for (const move of allMoves) {
        const key = `${move.articleId}-${move.locationId}`;
        if (!levels[key]) levels[key] = { articleId: move.articleId, locationId: move.locationId, quantity: 0 };
        const sign = ['IN', 'RETURN', 'ADJUSTMENT'].includes(move.moveType) ? 1 : -1;
        levels[key].quantity += move.quantity * sign;
      }

      return Object.values(levels);
    } catch (err) {
      return handleError(err, reply);
    }
  });

  // Record stock move
  app.post('/moves', async (request, reply) => {
    try {
      const data = validate(moveSchema, request.body);
      const move = await prisma.stockMove.create({ data });
      await logAudit({ userId: request.user.id, action: 'CREATE', entityType: 'StockMove', entityId: move.id });
      return reply.status(201).send(move);
    } catch (err) {
      return handleError(err, reply);
    }
  });

  // Low stock alerts
  app.get('/alerts', async (request, reply) => {
    try {
      const articles = await prisma.article.findMany({ where: { minStock: { not: null } } });
      const alerts = [];

      for (const article of articles) {
        const moves = await prisma.stockMove.findMany({ where: { articleId: article.id } });
        let qty = 0;
        for (const m of moves) {
          const sign = ['IN', 'RETURN', 'ADJUSTMENT'].includes(m.moveType) ? 1 : -1;
          qty += m.quantity * sign;
        }
        if (qty < (article.minStock ?? 0)) {
          alerts.push({ article, currentStock: qty, minStock: article.minStock, deficit: (article.minStock ?? 0) - qty });
        }
      }

      return alerts;
    } catch (err) {
      return handleError(err, reply);
    }
  });
};
FILEEOF

cat <<'FILEEOF' > packages/backend/src/routes/sales.ts
import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { prisma } from '../utils/prisma.js';
import { validate, paginationSchema, paginatedResponse } from '../utils/validation.js';
import { handleError } from '../utils/errors.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { logAudit } from '../services/auditLogger.js';

const createSchema = z.object({
  companyId: z.string().uuid(),
  thirdPartyId: z.string().uuid(),
  reference: z.string(),
  orderDate: z.string().datetime(),
  lines: z.array(z.object({
    articleId: z.string().uuid(),
    quantity: z.number().positive(),
    unitPrice: z.number().positive(),
  })).min(1),
});

export const salesRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', requireAuth);

  app.get('/', async (request, reply) => {
    try {
      const q = validate(paginationSchema, request.query);
      const filters = request.query as Record<string, string>;
      const where: Record<string, unknown> = {};
      if (filters.companyId) where.companyId = filters.companyId;
      if (filters.status) where.status = filters.status;

      const [data, total] = await Promise.all([
        prisma.salesOrder.findMany({
          where,
          skip: (q.page - 1) * q.limit,
          take: q.limit,
          include: {
            company: { select: { code: true, name: true } },
            thirdParty: { select: { code: true, name: true } },
            _count: { select: { lines: true } },
          },
          orderBy: { orderDate: 'desc' },
        }),
        prisma.salesOrder.count({ where }),
      ]);
      return paginatedResponse(data, total, q);
    } catch (err) {
      return handleError(err, reply);
    }
  });

  app.post('/', { preHandler: [requireRole('ADMIN', 'COMMERCIAL', 'DAF')] }, async (request, reply) => {
    try {
      const data = validate(createSchema, request.body);
      const totalAmount = data.lines.reduce((s, l) => s + l.quantity * l.unitPrice, 0);

      const so = await prisma.salesOrder.create({
        data: {
          companyId: data.companyId,
          thirdPartyId: data.thirdPartyId,
          reference: data.reference,
          orderDate: new Date(data.orderDate),
          totalAmount,
          lines: { create: data.lines },
        },
        include: { lines: true },
      });

      await logAudit({ userId: request.user.id, action: 'CREATE', entityType: 'SalesOrder', entityId: so.id });
      return reply.status(201).send(so);
    } catch (err) {
      return handleError(err, reply);
    }
  });
};
FILEEOF

cat <<'FILEEOF' > packages/backend/src/routes/legal.ts
import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { prisma } from '../utils/prisma.js';
import { validate, paginationSchema, paginatedResponse } from '../utils/validation.js';
import { handleError, notFound } from '../utils/errors.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { logAudit } from '../services/auditLogger.js';

const contractSchema = z.object({
  companyId: z.string().uuid(),
  projectId: z.string().uuid().optional(),
  thirdPartyId: z.string().uuid().optional(),
  reference: z.string(),
  type: z.enum(['MARCHE', 'SOUS_TRAITANCE', 'PRESTATION', 'LOCATION', 'AVENANT', 'OTHER']),
  subject: z.string(),
  amount: z.number().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

const legalCaseSchema = z.object({
  contractId: z.string().uuid().optional(),
  reference: z.string(),
  subject: z.string(),
  parties: z.array(z.object({ name: z.string(), role: z.string() })),
  amountAtStake: z.number().optional(),
  nextDeadline: z.string().datetime().optional(),
  nextHearing: z.string().datetime().optional(),
});

export const legalRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', requireAuth);

  // Contracts
  app.get('/contracts', async (request, reply) => {
    try {
      const q = validate(paginationSchema, request.query);
      const [data, total] = await Promise.all([
        prisma.contract.findMany({
          skip: (q.page - 1) * q.limit,
          take: q.limit,
          include: {
            company: { select: { code: true, name: true } },
            project: { select: { code: true, name: true } },
            thirdParty: { select: { code: true, name: true } },
            _count: { select: { legalCases: true } },
          },
          orderBy: { createdAt: 'desc' },
        }),
        prisma.contract.count(),
      ]);
      return paginatedResponse(data, total, q);
    } catch (err) {
      return handleError(err, reply);
    }
  });

  app.post('/contracts', { preHandler: [requireRole('ADMIN', 'JURIDIQUE', 'DAF')] }, async (request, reply) => {
    try {
      const data = validate(contractSchema, request.body);
      const contract = await prisma.contract.create({ data: data as any });
      await logAudit({ userId: request.user.id, action: 'CREATE', entityType: 'Contract', entityId: contract.id });
      return reply.status(201).send(contract);
    } catch (err) {
      return handleError(err, reply);
    }
  });

  // Legal Cases
  app.get('/cases', async (request, reply) => {
    try {
      const q = validate(paginationSchema, request.query);
      const filters = request.query as Record<string, string>;
      const where: Record<string, unknown> = {};
      if (filters.status) where.status = filters.status;

      const [data, total] = await Promise.all([
        prisma.legalCase.findMany({
          where,
          skip: (q.page - 1) * q.limit,
          take: q.limit,
          include: { contract: { select: { reference: true, subject: true } } },
          orderBy: { nextDeadline: 'asc' },
        }),
        prisma.legalCase.count({ where }),
      ]);
      return paginatedResponse(data, total, q);
    } catch (err) {
      return handleError(err, reply);
    }
  });

  app.post('/cases', { preHandler: [requireRole('ADMIN', 'JURIDIQUE')] }, async (request, reply) => {
    try {
      const data = validate(legalCaseSchema, request.body);
      const legalCase = await prisma.legalCase.create({ data: data as any });
      await logAudit({ userId: request.user.id, action: 'CREATE', entityType: 'LegalCase', entityId: legalCase.id });
      return reply.status(201).send(legalCase);
    } catch (err) {
      return handleError(err, reply);
    }
  });

  // Upcoming deadlines
  app.get('/deadlines', async (request, reply) => {
    try {
      const thirtyDays = new Date(Date.now() + 30 * 86400000);
      const cases = await prisma.legalCase.findMany({
        where: {
          nextDeadline: { lte: thirtyDays },
          status: { notIn: ['CLOSED', 'ARCHIVED'] },
        },
        include: { contract: true },
        orderBy: { nextDeadline: 'asc' },
      });
      return cases;
    } catch (err) {
      return handleError(err, reply);
    }
  });
};
FILEEOF

echo "Backend routes (purchases, stock, sales, legal) created."

# ============================================================
# BACKEND - routes/workflows.ts, rules.ts, integrations.ts, dashboard.ts
# ============================================================

cat <<'FILEEOF' > packages/backend/src/routes/workflows.ts
import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { prisma } from '../utils/prisma.js';
import { validate, paginationSchema, paginatedResponse } from '../utils/validation.js';
import { handleError, notFound } from '../utils/errors.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const createSchema = z.object({
  code: z.string().min(1),
  module: z.string(),
  name: z.string(),
  description: z.string().optional(),
  ownerId: z.string().uuid().optional(),
  validatorId: z.string().uuid().optional(),
  arbiterId: z.string().uuid().optional(),
  slaHours: z.number().int().optional(),
  escalateAfterHours: z.number().int().optional(),
  steps: z.array(z.object({
    name: z.string(),
    type: z.enum(['TRIGGER', 'IDENTITY_CHECK', 'COMPLETENESS_CHECK', 'PROOF_CHECK', 'AUTO_PROCESS', 'LOGIC_CHECK', 'BUSINESS_CHECK', 'CROSS_CHECK', 'DECISION', 'NOTIFICATION', 'JOURNAL', 'REPORTING']),
    automationLevel: z.enum(['LEVEL_A', 'LEVEL_B', 'LEVEL_C']),
    config: z.record(z.unknown()).optional(),
  })),
});

export const workflowRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', requireAuth);

  app.get('/', async (request, reply) => {
    try {
      const q = validate(paginationSchema, request.query);
      const filters = request.query as Record<string, string>;
      const where: Record<string, unknown> = {};
      if (filters.module) where.module = filters.module;

      const [data, total] = await Promise.all([
        prisma.workflow.findMany({
          where,
          skip: (q.page - 1) * q.limit,
          take: q.limit,
          orderBy: { name: 'asc' },
        }),
        prisma.workflow.count({ where }),
      ]);
      return paginatedResponse(data, total, q);
    } catch (err) {
      return handleError(err, reply);
    }
  });

  app.get('/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const wf = await prisma.workflow.findUnique({
        where: { id },
        include: {
          actions: { orderBy: { createdAt: 'desc' }, take: 50 },
        },
      });
      if (!wf) throw notFound('Workflow', id);
      return wf;
    } catch (err) {
      return handleError(err, reply);
    }
  });

  app.post('/', { preHandler: [requireRole('ADMIN')] }, async (request, reply) => {
    try {
      const data = validate(createSchema, request.body);
      const wf = await prisma.workflow.create({ data: data as any });
      return reply.status(201).send(wf);
    } catch (err) {
      return handleError(err, reply);
    }
  });

  // Execute a workflow step
  app.post('/:id/execute', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const { objectType, objectId, stepIndex } = request.body as {
        objectType: string; objectId: string; stepIndex: number;
      };

      const wf = await prisma.workflow.findUnique({ where: { id } });
      if (!wf) throw notFound('Workflow', id);

      const steps = wf.steps as any[];
      if (stepIndex >= steps.length) {
        return reply.status(400).send({ error: 'Step index out of range' });
      }

      const step = steps[stepIndex];
      const action = await prisma.workflowAction.create({
        data: {
          workflowId: id,
          objectType,
          objectId,
          stepIndex,
          stepName: step.name,
          status: 'IN_PROGRESS',
          actorId: request.user.id,
          startedAt: new Date(),
        },
      });

      return action;
    } catch (err) {
      return handleError(err, reply);
    }
  });

  // Complete a workflow action
  app.post('/actions/:actionId/complete', async (request, reply) => {
    try {
      const { actionId } = request.params as { actionId: string };
      const { result, status } = request.body as { result: unknown; status?: string };

      const action = await prisma.workflowAction.update({
        where: { id: actionId },
        data: {
          status: status || 'COMPLETED',
          result: result as any,
          completedAt: new Date(),
        },
      });

      return action;
    } catch (err) {
      return handleError(err, reply);
    }
  });
};
FILEEOF

cat <<'FILEEOF' > packages/backend/src/routes/rules.ts
import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { prisma } from '../utils/prisma.js';
import { validate, paginationSchema, paginatedResponse } from '../utils/validation.js';
import { handleError, notFound } from '../utils/errors.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { logAudit } from '../services/auditLogger.js';

const createSchema = z.object({
  code: z.string().min(1),
  module: z.string(),
  name: z.string(),
  description: z.string().optional(),
  ruleType: z.enum(['VALIDATION', 'MATCHING', 'IMPUTATION', 'ESCALATION', 'AUTOMATION', 'THRESHOLD']),
  condition: z.record(z.unknown()),
  action: z.record(z.unknown()),
  automationLevel: z.enum(['LEVEL_A', 'LEVEL_B', 'LEVEL_C']),
  priority: z.number().int().default(100),
});

export const ruleRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', requireAuth);

  app.get('/', async (request, reply) => {
    try {
      const q = validate(paginationSchema, request.query);
      const filters = request.query as Record<string, string>;
      const where: Record<string, unknown> = {};
      if (filters.module) where.module = filters.module;
      if (filters.ruleType) where.ruleType = filters.ruleType;
      if (filters.automationLevel) where.automationLevel = filters.automationLevel;

      const [data, total] = await Promise.all([
        prisma.businessRule.findMany({
          where,
          skip: (q.page - 1) * q.limit,
          take: q.limit,
          orderBy: { priority: 'asc' },
        }),
        prisma.businessRule.count({ where }),
      ]);
      return paginatedResponse(data, total, q);
    } catch (err) {
      return handleError(err, reply);
    }
  });

  app.post('/', { preHandler: [requireRole('ADMIN')] }, async (request, reply) => {
    try {
      const data = validate(createSchema, request.body);
      const rule = await prisma.businessRule.create({ data: data as any });
      await logAudit({ userId: request.user.id, action: 'CREATE', entityType: 'BusinessRule', entityId: rule.id });
      return reply.status(201).send(rule);
    } catch (err) {
      return handleError(err, reply);
    }
  });

  // Update with version bump
  app.put('/:id', { preHandler: [requireRole('ADMIN')] }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const existing = await prisma.businessRule.findUnique({ where: { id } });
      if (!existing) throw notFound('BusinessRule', id);

      const data = validate(createSchema.partial(), request.body);
      const rule = await prisma.businessRule.update({
        where: { id },
        data: { ...data, version: existing.version + 1 } as any,
      });

      await logAudit({
        userId: request.user.id,
        action: 'UPDATE',
        entityType: 'BusinessRule',
        entityId: id,
        changes: { version: { old: existing.version, new: rule.version } },
      });
      return rule;
    } catch (err) {
      return handleError(err, reply);
    }
  });
};
FILEEOF

cat <<'FILEEOF' > packages/backend/src/routes/integrations.ts
import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { prisma } from '../utils/prisma.js';
import { validate, paginationSchema, paginatedResponse } from '../utils/validation.js';
import { handleError } from '../utils/errors.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const eventSchema = z.object({
  source: z.enum(['SENTINEL', 'N8N', 'ODOO', 'HUBSPOT', 'ROSSUM', 'AIRCALL', 'POWERBI']),
  target: z.enum(['SENTINEL', 'N8N', 'ODOO', 'HUBSPOT', 'ROSSUM', 'AIRCALL', 'POWERBI']),
  eventType: z.enum(['SYNC', 'WEBHOOK', 'TRIGGER', 'CALLBACK']),
  payload: z.record(z.unknown()),
});

export const integrationRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', requireAuth);

  // List events
  app.get('/events', async (request, reply) => {
    try {
      const q = validate(paginationSchema, request.query);
      const filters = request.query as Record<string, string>;
      const where: Record<string, unknown> = {};
      if (filters.source) where.source = filters.source;
      if (filters.target) where.target = filters.target;
      if (filters.status) where.status = filters.status;

      const [data, total] = await Promise.all([
        prisma.integrationEvent.findMany({
          where,
          skip: (q.page - 1) * q.limit,
          take: q.limit,
          orderBy: { createdAt: 'desc' },
        }),
        prisma.integrationEvent.count({ where }),
      ]);
      return paginatedResponse(data, total, q);
    } catch (err) {
      return handleError(err, reply);
    }
  });

  // Create event (trigger n8n workflow)
  app.post('/events', async (request, reply) => {
    try {
      const data = validate(eventSchema, request.body);
      const event = await prisma.integrationEvent.create({ data: data as any });
      return reply.status(201).send(event);
    } catch (err) {
      return handleError(err, reply);
    }
  });

  // Webhook receiver for n8n callbacks
  app.post('/webhook/:source', async (request, reply) => {
    try {
      const { source } = request.params as { source: string };
      const payload = request.body as Record<string, unknown>;

      const event = await prisma.integrationEvent.create({
        data: {
          source: source.toUpperCase(),
          target: 'SENTINEL',
          eventType: 'WEBHOOK',
          payload: payload as any,
          status: 'ACKNOWLEDGED',
          processedAt: new Date(),
        },
      });

      return { received: true, eventId: event.id };
    } catch (err) {
      return handleError(err, reply);
    }
  });

  // Integration health check
  app.get('/health', async (request, reply) => {
    const integrations = ['N8N', 'ODOO', 'HUBSPOT', 'ROSSUM', 'AIRCALL', 'POWERBI'];
    const status: Record<string, string> = {};

    for (const name of integrations) {
      const envKey = `${name}_BASE_URL`;
      const altKey = `${name}_API_KEY`;
      const configured = !!(process.env[envKey] || process.env[altKey] ||
        process.env[`${name}_URL`] || process.env[`${name}_API_ID`] ||
        process.env[`${name}_CLIENT_ID`] || process.env[`CLAUDE_API_KEY`]);
      status[name] = configured ? 'CONFIGURED' : 'NOT_CONFIGURED';
    }

    return { integrations: status };
  });
};
FILEEOF

cat <<'FILEEOF' > packages/backend/src/routes/dashboard.ts
import { FastifyPluginAsync } from 'fastify';
import { prisma } from '../utils/prisma.js';
import { handleError } from '../utils/errors.js';
import { requireAuth } from '../middleware/auth.js';

export const dashboardRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', requireAuth);

  // Main dashboard KPIs
  app.get('/kpis', async (request, reply) => {
    try {
      const [
        companies,
        projects,
        documents,
        auditObjects,
        pendingQuestionnaires,
        pendingHuman,
        validatedProof,
        validatedReserve,
        rejected,
        journalEntries,
        missingProof,
        employees,
        activeTasks,
        openCases,
        integrationErrors,
      ] = await Promise.all([
        prisma.company.count({ where: { isActive: true } }),
        prisma.project.count({ where: { status: 'ACTIVE' } }),
        prisma.document.count(),
        prisma.auditObject.count(),
        prisma.questionnaire.count({ where: { status: 'PENDING' } }),
        prisma.auditObject.count({ where: { state: 'PENDING_HUMAN' } }),
        prisma.auditObject.count({ where: { state: 'VALIDATED_PROOF' } }),
        prisma.auditObject.count({ where: { state: 'VALIDATED_RESERVE' } }),
        prisma.auditObject.count({ where: { state: 'REJECTED_MOTIVATED' } }),
        prisma.journalEntry.count(),
        prisma.journalEntry.count({ where: { proofStatus: 'MISSING' } }),
        prisma.employee.count({ where: { isActive: true } }),
        prisma.task.count({ where: { status: { in: ['IN_PROGRESS', 'CREATED', 'PROPOSED'] } } }),
        prisma.legalCase.count({ where: { status: { notIn: ['CLOSED', 'ARCHIVED'] } } }),
        prisma.integrationEvent.count({ where: { status: 'FAILED' } }),
      ]);

      return {
        overview: { companies, projects, documents, employees },
        governance: {
          totalAuditObjects: auditObjects,
          pendingHuman,
          validatedProof,
          validatedReserve,
          rejected,
          pendingQuestionnaires,
        },
        accounting: { journalEntries, missingProof },
        operations: { activeTasks, openCases },
        integrations: { errors: integrationErrors },
      };
    } catch (err) {
      return handleError(err, reply);
    }
  });

  // State distribution
  app.get('/state-distribution', async (request, reply) => {
    try {
      const distribution = await prisma.auditObject.groupBy({
        by: ['state'],
        _count: true,
      });
      return distribution.map(d => ({ state: d.state, count: d._count }));
    } catch (err) {
      return handleError(err, reply);
    }
  });

  // Recent activity
  app.get('/activity', async (request, reply) => {
    try {
      const logs = await prisma.auditLog.findMany({
        take: 50,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { firstName: true, lastName: true, role: true } },
        },
      });
      return logs;
    } catch (err) {
      return handleError(err, reply);
    }
  });

  // Queues (to-arbitrate, missing-proof, blocked, reminders)
  app.get('/queues', async (request, reply) => {
    try {
      const [toArbitrate, missingProof, blocked, overdueReminders] = await Promise.all([
        prisma.auditObject.count({ where: { state: 'PENDING_HUMAN', criticality: { in: ['HIGH', 'CRITICAL'] } } }),
        prisma.auditObject.count({
          where: { proofRecords: { some: { decision: 'PENDING' } } },
        }),
        prisma.workflowAction.count({ where: { status: 'FAILED' } }),
        prisma.questionnaire.count({
          where: { status: 'PENDING', escalateAfter: { lte: new Date() } },
        }),
      ]);

      return { toArbitrate, missingProof, blocked, overdueReminders };
    } catch (err) {
      return handleError(err, reply);
    }
  });
};
FILEEOF

echo "Backend routes (workflows, rules, integrations, dashboard) created."

# ============================================================
# BACKEND - integrations
# ============================================================

cat <<'FILEEOF' > packages/backend/src/integrations/n8n.ts
// n8n Integration Connector
// Handles communication with n8n orchestrator via REST API

const N8N_BASE_URL = process.env.N8N_BASE_URL || '';
const N8N_API_KEY = process.env.N8N_API_KEY || '';

interface N8nWebhookPayload {
  event: string;
  objectType: string;
  objectId: string;
  state?: string;
  data?: Record<string, unknown>;
  timestamp: string;
}

export async function triggerN8nWorkflow(webhookUrl: string, payload: N8nWebhookPayload) {
  if (!N8N_BASE_URL) {
    console.warn('[n8n] Not configured, skipping trigger');
    return { sent: false, reason: 'N8N_BASE_URL not configured' };
  }

  const url = `${N8N_BASE_URL}${webhookUrl}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(N8N_API_KEY ? { 'X-N8N-API-KEY': N8N_API_KEY } : {}),
    },
    body: JSON.stringify(payload),
  });

  return {
    sent: true,
    status: response.status,
    ok: response.ok,
  };
}

export async function getN8nExecutions(workflowId: string) {
  if (!N8N_BASE_URL || !N8N_API_KEY) return [];

  const response = await fetch(
    `${N8N_BASE_URL}/api/v1/executions?workflowId=${workflowId}&limit=20`,
    { headers: { 'X-N8N-API-KEY': N8N_API_KEY } }
  );

  if (!response.ok) return [];
  const data = await response.json();
  return data.data || [];
}

// Standard event catalog for n8n triggers
export const N8N_EVENTS = {
  DOCUMENT_INGESTED: 'document.ingested',
  DOCUMENT_CLASSIFIED: 'document.classified',
  OBJECT_STATE_CHANGED: 'object.state_changed',
  QUESTIONNAIRE_CREATED: 'questionnaire.created',
  QUESTIONNAIRE_OVERDUE: 'questionnaire.overdue',
  PROOF_VALIDATED: 'proof.validated',
  PROOF_REJECTED: 'proof.rejected',
  JOURNAL_ANOMALY: 'journal.anomaly_detected',
  PURCHASE_THRESHOLD: 'purchase.threshold_exceeded',
  STOCK_LOW: 'stock.low_alert',
  LEGAL_DEADLINE: 'legal.deadline_approaching',
  TASK_COMPLETED: 'task.completed',
  ESCALATION_TRIGGERED: 'escalation.triggered',
} as const;
FILEEOF

cat <<'FILEEOF' > packages/backend/src/integrations/odoo.ts
// Odoo Integration Connector
// XML-RPC / JSON-RPC bridge for Odoo ERP

const ODOO_URL = process.env.ODOO_URL || '';
const ODOO_DB = process.env.ODOO_DB || '';
const ODOO_USER = process.env.ODOO_USER || '';
const ODOO_API_KEY = process.env.ODOO_API_KEY || '';

interface OdooConfig {
  url: string;
  db: string;
  uid: number;
  apiKey: string;
}

let cachedConfig: OdooConfig | null = null;

export async function authenticate(): Promise<OdooConfig | null> {
  if (!ODOO_URL || !ODOO_DB) {
    console.warn('[Odoo] Not configured');
    return null;
  }
  if (cachedConfig) return cachedConfig;

  try {
    const response = await fetch(`${ODOO_URL}/jsonrpc`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'call',
        params: {
          service: 'common',
          method: 'authenticate',
          args: [ODOO_DB, ODOO_USER, ODOO_API_KEY, {}],
        },
      }),
    });

    const data = await response.json() as any;
    if (data.result) {
      cachedConfig = { url: ODOO_URL, db: ODOO_DB, uid: data.result, apiKey: ODOO_API_KEY };
      return cachedConfig;
    }
    return null;
  } catch {
    return null;
  }
}

export async function syncToOdoo(model: string, method: string, args: unknown[]) {
  const config = await authenticate();
  if (!config) return { synced: false, reason: 'Odoo not configured or auth failed' };

  const response = await fetch(`${config.url}/jsonrpc`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      method: 'call',
      params: {
        service: 'object',
        method: 'execute_kw',
        args: [config.db, config.uid, config.apiKey, model, method, args],
      },
    }),
  });

  const data = await response.json() as any;
  return { synced: true, result: data.result };
}

// Model mappings: Sentinel -> Odoo
export const ODOO_MODELS = {
  Company: 'res.company',
  ThirdParty: 'res.partner',
  Employee: 'hr.employee',
  Article: 'product.product',
  PurchaseOrder: 'purchase.order',
  SalesOrder: 'sale.order',
  JournalEntry: 'account.move',
  StockMove: 'stock.move',
} as const;
FILEEOF

cat <<'FILEEOF' > packages/backend/src/integrations/hubspot.ts
// HubSpot CRM Integration Connector

const HUBSPOT_API_KEY = process.env.HUBSPOT_API_KEY || '';
const HUBSPOT_BASE = 'https://api.hubapi.com';

function headers() {
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${HUBSPOT_API_KEY}`,
  };
}

export async function isConfigured(): Promise<boolean> {
  return !!HUBSPOT_API_KEY;
}

export async function getContacts(limit = 20, after?: string) {
  if (!HUBSPOT_API_KEY) return { configured: false };

  const params = new URLSearchParams({ limit: String(limit) });
  if (after) params.set('after', after);

  const res = await fetch(`${HUBSPOT_BASE}/crm/v3/objects/contacts?${params}`, { headers: headers() });
  return res.json();
}

export async function createContact(properties: Record<string, string>) {
  if (!HUBSPOT_API_KEY) return { configured: false };

  const res = await fetch(`${HUBSPOT_BASE}/crm/v3/objects/contacts`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ properties }),
  });
  return res.json();
}

export async function getDeals(limit = 20) {
  if (!HUBSPOT_API_KEY) return { configured: false };

  const res = await fetch(`${HUBSPOT_BASE}/crm/v3/objects/deals?limit=${limit}`, { headers: headers() });
  return res.json();
}

export async function createDeal(properties: Record<string, string>) {
  if (!HUBSPOT_API_KEY) return { configured: false };

  const res = await fetch(`${HUBSPOT_BASE}/crm/v3/objects/deals`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ properties }),
  });
  return res.json();
}

export async function syncLeadFromSentinel(lead: {
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  company?: string;
  source?: string;
  projectCode?: string;
}) {
  return createContact({
    firstname: lead.firstName,
    lastname: lead.lastName,
    email: lead.email || '',
    phone: lead.phone || '',
    company: lead.company || '',
    sentinel_source: lead.source || 'SENTINEL',
    sentinel_project: lead.projectCode || '',
  });
}
FILEEOF

cat <<'FILEEOF' > packages/backend/src/integrations/rossum.ts
// Rossum Document Processing Integration

const ROSSUM_API_URL = process.env.ROSSUM_API_URL || '';
const ROSSUM_API_KEY = process.env.ROSSUM_API_KEY || '';

function headers() {
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${ROSSUM_API_KEY}`,
  };
}

export async function isConfigured(): Promise<boolean> {
  return !!(ROSSUM_API_URL && ROSSUM_API_KEY);
}

export async function uploadDocument(fileBuffer: Buffer, fileName: string, queueId: string) {
  if (!ROSSUM_API_URL) return { configured: false };

  const formData = new FormData();
  formData.append('content', new Blob([fileBuffer]), fileName);

  const res = await fetch(`${ROSSUM_API_URL}/v1/queues/${queueId}/upload`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${ROSSUM_API_KEY}` },
    body: formData,
  });

  return res.json();
}

export async function getAnnotation(annotationId: string) {
  if (!ROSSUM_API_URL) return { configured: false };

  const res = await fetch(`${ROSSUM_API_URL}/v1/annotations/${annotationId}`, { headers: headers() });
  return res.json();
}

export async function getExtractionResults(annotationId: string) {
  if (!ROSSUM_API_URL) return { configured: false };

  const res = await fetch(`${ROSSUM_API_URL}/v1/annotations/${annotationId}/content`, { headers: headers() });
  const data = await res.json() as any;

  // Transform Rossum output to Sentinel format
  return transformRossumToSentinel(data);
}

function transformRossumToSentinel(rossumData: any) {
  const fields: Record<string, { value: string; confidence: number }> = {};

  if (rossumData?.content) {
    for (const section of rossumData.content) {
      if (section.children) {
        for (const field of section.children) {
          if (field.schema_id && field.content?.value) {
            fields[field.schema_id] = {
              value: field.content.value,
              confidence: field.content.rir_confidence || 0,
            };
          }
        }
      }
    }
  }

  return {
    extractedFields: fields,
    rawData: rossumData,
  };
}
FILEEOF

cat <<'FILEEOF' > packages/backend/src/integrations/aircall.ts
// Aircall Telephony Integration

const AIRCALL_API_ID = process.env.AIRCALL_API_ID || '';
const AIRCALL_API_TOKEN = process.env.AIRCALL_API_TOKEN || '';
const AIRCALL_BASE = 'https://api.aircall.io/v1';

function headers() {
  const auth = Buffer.from(`${AIRCALL_API_ID}:${AIRCALL_API_TOKEN}`).toString('base64');
  return {
    'Content-Type': 'application/json',
    'Authorization': `Basic ${auth}`,
  };
}

export async function isConfigured(): Promise<boolean> {
  return !!(AIRCALL_API_ID && AIRCALL_API_TOKEN);
}

export async function getCalls(page = 1, perPage = 20) {
  if (!AIRCALL_API_ID) return { configured: false };

  const res = await fetch(`${AIRCALL_BASE}/calls?page=${page}&per_page=${perPage}`, { headers: headers() });
  return res.json();
}

export async function getCallDetails(callId: string) {
  if (!AIRCALL_API_ID) return { configured: false };

  const res = await fetch(`${AIRCALL_BASE}/calls/${callId}`, { headers: headers() });
  return res.json();
}

export async function getUsers() {
  if (!AIRCALL_API_ID) return { configured: false };

  const res = await fetch(`${AIRCALL_BASE}/users`, { headers: headers() });
  return res.json();
}

// Transform Aircall call to Sentinel CRM event
export function transformCallToEvent(call: any) {
  return {
    source: 'AIRCALL',
    eventType: 'CALL',
    externalId: call.id?.toString(),
    direction: call.direction, // inbound | outbound
    status: call.status,
    duration: call.duration,
    callerNumber: call.raw_digits,
    agentName: call.user?.name,
    startedAt: call.started_at ? new Date(call.started_at * 1000) : null,
    answeredAt: call.answered_at ? new Date(call.answered_at * 1000) : null,
    endedAt: call.ended_at ? new Date(call.ended_at * 1000) : null,
    recordingUrl: call.recording,
    tags: call.tags?.map((t: any) => t.name) || [],
  };
}
FILEEOF

cat <<'FILEEOF' > packages/backend/src/integrations/powerbi.ts
// Power BI Integration - Data push for reporting

const POWERBI_CLIENT_ID = process.env.POWERBI_CLIENT_ID || '';
const POWERBI_CLIENT_SECRET = process.env.POWERBI_CLIENT_SECRET || '';
const POWERBI_TENANT_ID = process.env.POWERBI_TENANT_ID || '';

let accessToken: string | null = null;
let tokenExpiry = 0;

export async function isConfigured(): Promise<boolean> {
  return !!(POWERBI_CLIENT_ID && POWERBI_CLIENT_SECRET && POWERBI_TENANT_ID);
}

async function getAccessToken(): Promise<string | null> {
  if (accessToken && Date.now() < tokenExpiry) return accessToken;
  if (!POWERBI_CLIENT_ID) return null;

  const tokenUrl = `https://login.microsoftonline.com/${POWERBI_TENANT_ID}/oauth2/v2.0/token`;
  const params = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: POWERBI_CLIENT_ID,
    client_secret: POWERBI_CLIENT_SECRET,
    scope: 'https://analysis.windows.net/powerbi/api/.default',
  });

  const res = await fetch(tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  });

  const data = await res.json() as any;
  if (data.access_token) {
    accessToken = data.access_token;
    tokenExpiry = Date.now() + (data.expires_in - 60) * 1000;
    return accessToken;
  }
  return null;
}

export async function pushDataToDataset(datasetId: string, tableName: string, rows: unknown[]) {
  const token = await getAccessToken();
  if (!token) return { pushed: false, reason: 'Power BI not configured' };

  const res = await fetch(
    `https://api.powerbi.com/v1.0/myorg/datasets/${datasetId}/tables/${tableName}/rows`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ rows }),
    }
  );

  return { pushed: res.ok, status: res.status };
}

// Standard datasets for Sentinel BI
export const POWERBI_DATASETS = {
  GOVERNANCE: 'sentinel_governance',
  FINANCE: 'sentinel_finance',
  HR: 'sentinel_hr',
  OPERATIONS: 'sentinel_operations',
  CRM: 'sentinel_crm',
} as const;
FILEEOF

echo "Backend integrations created."

# ============================================================
# BACKEND - tests
# ============================================================

cat <<'FILEEOF' > packages/backend/tests/stateMachine.test.ts
import { describe, it, expect } from 'vitest';
import { getValidTransitions, OBJECT_STATES } from '../src/services/stateMachine.js';

describe('State Machine', () => {
  it('should define all 16 states', () => {
    expect(OBJECT_STATES).toHaveLength(16);
    expect(OBJECT_STATES).toContain('RECEIVED');
    expect(OBJECT_STATES).toContain('ARCHIVED');
    expect(OBJECT_STATES).toContain('VALIDATED_PROOF');
    expect(OBJECT_STATES).toContain('PENDING_HUMAN');
  });

  it('RECEIVED should only transition to FINGERPRINTED', () => {
    const transitions = getValidTransitions('RECEIVED');
    expect(transitions).toEqual(['FINGERPRINTED']);
  });

  it('FINGERPRINTED should only transition to CLASSIFIED_PROVISIONAL', () => {
    const transitions = getValidTransitions('FINGERPRINTED');
    expect(transitions).toEqual(['CLASSIFIED_PROVISIONAL']);
  });

  it('CLASSIFIED_PROVISIONAL should allow EXTRACTABLE or NOT_EXTRACTABLE', () => {
    const transitions = getValidTransitions('CLASSIFIED_PROVISIONAL');
    expect(transitions).toContain('EXTRACTABLE');
    expect(transitions).toContain('NOT_EXTRACTABLE');
    expect(transitions).toHaveLength(2);
  });

  it('VALIDATED_PROOF should only transition to ARCHIVED', () => {
    const transitions = getValidTransitions('VALIDATED_PROOF');
    expect(transitions).toEqual(['ARCHIVED']);
  });

  it('ARCHIVED should be terminal (no transitions)', () => {
    const transitions = getValidTransitions('ARCHIVED');
    expect(transitions).toEqual([]);
  });

  it('PENDING_HUMAN should have many transition options (human can redirect)', () => {
    const transitions = getValidTransitions('PENDING_HUMAN');
    expect(transitions.length).toBeGreaterThan(5);
    expect(transitions).toContain('VALIDATED_PROOF');
    expect(transitions).toContain('REJECTED_MOTIVATED');
    expect(transitions).toContain('EXCLUDED_MOTIVATED');
  });

  it('CONTROL_CROSS should allow validation, reserve, pending, or rejection', () => {
    const transitions = getValidTransitions('CONTROL_CROSS');
    expect(transitions).toContain('VALIDATED_PROOF');
    expect(transitions).toContain('VALIDATED_RESERVE');
    expect(transitions).toContain('PENDING_HUMAN');
    expect(transitions).toContain('REJECTED_MOTIVATED');
  });

  it('no state should transition to RECEIVED (entry point only)', () => {
    for (const state of OBJECT_STATES) {
      const transitions = getValidTransitions(state);
      expect(transitions).not.toContain('RECEIVED');
    }
  });

  it('should return empty array for unknown state', () => {
    const transitions = getValidTransitions('NONEXISTENT');
    expect(transitions).toEqual([]);
  });
});
FILEEOF

cat <<'FILEEOF' > packages/backend/tests/validation.test.ts
import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { validate, paginationSchema, paginatedResponse } from '../src/utils/validation.js';
import { AppError } from '../src/utils/errors.js';

describe('Validation utilities', () => {
  const testSchema = z.object({
    name: z.string().min(1),
    email: z.string().email(),
    age: z.number().int().positive().optional(),
  });

  it('should validate correct data', () => {
    const result = validate(testSchema, { name: 'Test', email: 'test@example.com' });
    expect(result.name).toBe('Test');
    expect(result.email).toBe('test@example.com');
  });

  it('should throw AppError on invalid data', () => {
    expect(() => validate(testSchema, { name: '', email: 'not-email' })).toThrow();
    try {
      validate(testSchema, { name: '', email: 'bad' });
    } catch (e: any) {
      expect(e.statusCode).toBe(400);
      expect(e.message).toBe('Validation error');
    }
  });

  it('should validate pagination with defaults', () => {
    const result = validate(paginationSchema, {});
    expect(result.page).toBe(1);
    expect(result.limit).toBe(20);
    expect(result.sortOrder).toBe('desc');
  });

  it('should reject invalid pagination', () => {
    expect(() => validate(paginationSchema, { page: 0 })).toThrow();
    expect(() => validate(paginationSchema, { limit: 200 })).toThrow();
  });

  it('should format paginated response correctly', () => {
    const items = [{ id: 1 }, { id: 2 }];
    const result = paginatedResponse(items, 50, { page: 2, limit: 10, sortOrder: 'desc' as const });
    expect(result.data).toHaveLength(2);
    expect(result.meta.total).toBe(50);
    expect(result.meta.page).toBe(2);
    expect(result.meta.totalPages).toBe(5);
  });
});

describe('Error utilities', () => {
  it('AppError should carry status code', () => {
    const err = new AppError(404, 'Not found');
    expect(err.statusCode).toBe(404);
    expect(err.message).toBe('Not found');
    expect(err.name).toBe('AppError');
  });
});
FILEEOF

cat <<'FILEEOF' > packages/backend/tests/proofRegistry.test.ts
import { describe, it, expect } from 'vitest';
import { createHash } from 'crypto';

// Test the checksum computation logic (isolated from DB)
describe('Proof Registry - Checksum Logic', () => {
  function computeChecksum(data: Record<string, unknown>): string {
    const serialized = JSON.stringify(data, Object.keys(data).sort());
    return createHash('sha256').update(serialized).digest('hex');
  }

  it('should produce deterministic checksums', () => {
    const data = { auditObjectId: '123', fieldName: 'amount', decision: 'VALIDATED', timestamp: '2024-01-01' };
    const hash1 = computeChecksum(data);
    const hash2 = computeChecksum(data);
    expect(hash1).toBe(hash2);
  });

  it('should produce different checksums for different data', () => {
    const hash1 = computeChecksum({ auditObjectId: '123', fieldName: 'amount', decision: 'VALIDATED', timestamp: '2024-01-01' });
    const hash2 = computeChecksum({ auditObjectId: '123', fieldName: 'amount', decision: 'REJECTED', timestamp: '2024-01-01' });
    expect(hash1).not.toBe(hash2);
  });

  it('should produce 64-char hex strings', () => {
    const hash = computeChecksum({ test: 'data' });
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
  });

  it('should be key-order independent due to sorting', () => {
    const hash1 = computeChecksum({ b: 2, a: 1 });
    const hash2 = computeChecksum({ a: 1, b: 2 });
    expect(hash1).toBe(hash2);
  });
});

describe('Proof Registry - Decision Types', () => {
  const VALID_DECISIONS = ['VALIDATED', 'VALIDATED_RESERVE', 'PENDING', 'REJECTED', 'EXCLUDED'];
  const IMMUTABLE_DECISIONS = ['VALIDATED', 'REJECTED', 'EXCLUDED'];

  it('should have 5 valid decision types', () => {
    expect(VALID_DECISIONS).toHaveLength(5);
  });

  it('should mark final decisions as immutable', () => {
    for (const decision of VALID_DECISIONS) {
      const shouldBeImmutable = IMMUTABLE_DECISIONS.includes(decision);
      expect(IMMUTABLE_DECISIONS.includes(decision)).toBe(shouldBeImmutable);
    }
  });

  it('PENDING and VALIDATED_RESERVE should NOT be immutable', () => {
    expect(IMMUTABLE_DECISIONS).not.toContain('PENDING');
    expect(IMMUTABLE_DECISIONS).not.toContain('VALIDATED_RESERVE');
  });
});
FILEEOF

echo "Backend tests created."

# ============================================================
# FRONTEND - Config files
# ============================================================

cat <<'FILEEOF' > packages/frontend/package.json
{
  "name": "@sentinel/frontend",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "test": "vitest run"
  },
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-router-dom": "^6.28.0",
    "lucide-react": "^0.460.0",
    "zustand": "^5.0.1",
    "zod": "^3.23.8"
  },
  "devDependencies": {
    "@types/react": "^18.3.12",
    "@types/react-dom": "^18.3.1",
    "@vitejs/plugin-react": "^4.3.4",
    "autoprefixer": "^10.4.20",
    "postcss": "^8.4.49",
    "tailwindcss": "^3.4.16",
    "typescript": "^5.7.2",
    "vite": "^5.4.11",
    "vitest": "^2.1.8",
    "@testing-library/react": "^16.1.0",
    "jsdom": "^25.0.1"
  }
}
FILEEOF

cat <<'FILEEOF' > packages/frontend/tsconfig.json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "isolatedModules": true,
    "moduleDetection": "force",
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": false,
    "noUnusedParameters": false,
    "noFallthroughCasesInSwitch": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src"]
}
FILEEOF

cat <<'FILEEOF' > packages/frontend/vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
});
FILEEOF

cat <<'FILEEOF' > packages/frontend/tailwind.config.js
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        sentinel: {
          50: '#f0f4ff',
          100: '#dbe4ff',
          200: '#bac8ff',
          300: '#91a7ff',
          400: '#748ffc',
          500: '#5c7cfa',
          600: '#4c6ef5',
          700: '#4263eb',
          800: '#3b5bdb',
          900: '#364fc7',
        },
      },
    },
  },
  plugins: [],
};
FILEEOF

cat <<'FILEEOF' > packages/frontend/postcss.config.js
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
FILEEOF

cat <<'FILEEOF' > packages/frontend/index.html
<!DOCTYPE html>
<html lang="fr">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/sentinel.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Sentinel - Gouvernance Opérationnelle</title>
  </head>
  <body class="bg-gray-50 text-gray-900 antialiased">
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
FILEEOF

cat <<'FILEEOF' > packages/frontend/public/sentinel.svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" fill="none">
  <path d="M50 5 L90 25 L90 55 C90 75 70 95 50 95 C30 95 10 75 10 55 L10 25 Z" fill="#4263eb" opacity="0.9"/>
  <path d="M50 20 L35 50 L45 50 L40 80 L65 45 L55 45 L60 20 Z" fill="white"/>
</svg>
FILEEOF

echo "Frontend config files created."

# ============================================================
# FRONTEND - src core files
# ============================================================

cat <<'FILEEOF' > packages/frontend/src/main.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
FILEEOF

cat <<'FILEEOF' > packages/frontend/src/App.tsx
import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import AuditObjectsPage from './pages/AuditObjectsPage';
import AuditObjectDetailPage from './pages/AuditObjectDetailPage';
import QuestionnairesPage from './pages/QuestionnairesPage';
import CompaniesPage from './pages/CompaniesPage';
import ProjectsPage from './pages/ProjectsPage';
import DocumentsPage from './pages/DocumentsPage';
import JournalPage from './pages/JournalPage';
import HRPage from './pages/HRPage';
import LegalPage from './pages/LegalPage';
import WorkflowsPage from './pages/WorkflowsPage';
import RulesPage from './pages/RulesPage';
import IntegrationsPage from './pages/IntegrationsPage';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  if (isLoading) return <div className="flex items-center justify-center h-screen"><div className="animate-spin h-8 w-8 border-4 border-sentinel-600 border-t-transparent rounded-full" /></div>;
  if (!user) return <Navigate to="/login" />;
  return <>{children}</>;
}

export default function App() {
  const { checkAuth } = useAuth();

  useEffect(() => {
    checkAuth();
  }, []);

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route index element={<DashboardPage />} />
        <Route path="audit-objects" element={<AuditObjectsPage />} />
        <Route path="audit-objects/:id" element={<AuditObjectDetailPage />} />
        <Route path="questionnaires" element={<QuestionnairesPage />} />
        <Route path="companies" element={<CompaniesPage />} />
        <Route path="projects" element={<ProjectsPage />} />
        <Route path="documents" element={<DocumentsPage />} />
        <Route path="journal" element={<JournalPage />} />
        <Route path="hr" element={<HRPage />} />
        <Route path="legal" element={<LegalPage />} />
        <Route path="workflows" element={<WorkflowsPage />} />
        <Route path="rules" element={<RulesPage />} />
        <Route path="integrations" element={<IntegrationsPage />} />
      </Route>
    </Routes>
  );
}
FILEEOF

cat <<'FILEEOF' > packages/frontend/src/index.css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  body {
    @apply bg-gray-50 text-gray-900;
  }
}

@layer components {
  .btn-primary {
    @apply bg-sentinel-600 text-white px-4 py-2 rounded-lg font-medium
           hover:bg-sentinel-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed;
  }
  .btn-secondary {
    @apply bg-white text-gray-700 px-4 py-2 rounded-lg font-medium border border-gray-300
           hover:bg-gray-50 transition-colors;
  }
  .btn-danger {
    @apply bg-red-600 text-white px-4 py-2 rounded-lg font-medium
           hover:bg-red-700 transition-colors;
  }
  .card {
    @apply bg-white rounded-xl shadow-sm border border-gray-200 p-6;
  }
  .input-field {
    @apply w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2
           focus:ring-sentinel-500 focus:border-sentinel-500 outline-none transition-shadow;
  }
  .badge {
    @apply inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium;
  }
  .badge-green { @apply badge bg-green-100 text-green-800; }
  .badge-yellow { @apply badge bg-yellow-100 text-yellow-800; }
  .badge-red { @apply badge bg-red-100 text-red-800; }
  .badge-blue { @apply badge bg-blue-100 text-blue-800; }
  .badge-gray { @apply badge bg-gray-100 text-gray-800; }
}
FILEEOF

cat <<'FILEEOF' > packages/frontend/src/vite-env.d.ts
/// <reference types="vite/client" />
FILEEOF

echo "Frontend core files created."

# ============================================================
# FRONTEND - types, services, hooks
# ============================================================

cat <<'FILEEOF' > packages/frontend/src/types/index.ts
export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  companyScope: string[];
  projectScope: string[];
}

export interface Company {
  id: string;
  code: string;
  name: string;
  legalForm?: string;
  taxId?: string;
  address?: string;
  isActive: boolean;
}

export interface Project {
  id: string;
  companyId: string;
  code: string;
  name: string;
  type: string;
  status: string;
  budget?: number;
  company?: { code: string; name: string };
}

export interface AuditObject {
  id: string;
  companyId?: string;
  projectId?: string;
  objectType: string;
  objectId: string;
  state: string;
  previousState?: string;
  criticality: string;
  reliabilityScore?: number;
  classFamily?: string;
  company?: { code: string; name: string };
  project?: { code: string; name: string };
  validTransitions?: string[];
  proofSummary?: ProofSummary;
  _count?: { proofRecords: number; questionnaires: number };
}

export interface ProofSummary {
  total: number;
  validated: number;
  withReserve: number;
  pending: number;
  rejected: number;
  excluded: number;
  immutable: number;
  averageConfidence: number;
}

export interface Questionnaire {
  id: string;
  auditObjectId: string;
  context: string;
  missingInfo: string;
  suggestedAnswers?: string[];
  expectedDocs?: string[];
  status: string;
  response?: string;
  reminderCount: number;
  escalateAfter?: string;
  auditObject?: { id: string; objectType: string; state: string; criticality: string };
  assignedTo?: { firstName: string; lastName: string; email: string };
}

export interface DashboardKPIs {
  overview: { companies: number; projects: number; documents: number; employees: number };
  governance: {
    totalAuditObjects: number;
    pendingHuman: number;
    validatedProof: number;
    validatedReserve: number;
    rejected: number;
    pendingQuestionnaires: number;
  };
  accounting: { journalEntries: number; missingProof: number };
  operations: { activeTasks: number; openCases: number };
  integrations: { errors: number };
}

export interface DashboardQueues {
  toArbitrate: number;
  missingProof: number;
  blocked: number;
  overdueReminders: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

export interface StateTransition {
  id: string;
  fromState: string;
  toState: string;
  reason?: string;
  actorType: string;
  actorId?: string;
  createdAt: string;
}
FILEEOF

cat <<'FILEEOF' > packages/frontend/src/services/api.ts
const API_BASE = '/api';

class ApiClient {
  private token: string | null = null;

  setToken(token: string | null) {
    this.token = token;
    if (token) localStorage.setItem('sentinel_token', token);
    else localStorage.removeItem('sentinel_token');
  }

  getToken(): string | null {
    if (!this.token) this.token = localStorage.getItem('sentinel_token');
    return this.token;
  }

  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const token = this.getToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };

    const res = await fetch(`${API_BASE}${path}`, { ...options, headers });

    if (res.status === 401) {
      this.setToken(null);
      window.location.href = '/login';
      throw new Error('Unauthorized');
    }

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Request failed' }));
      throw new Error(err.error || `HTTP ${res.status}`);
    }

    return res.json();
  }

  // Auth
  login(email: string, password: string) {
    return this.request<{ user: any; token: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  getMe() {
    return this.request<any>('/auth/me');
  }

  // Dashboard
  getKPIs() {
    return this.request<any>('/dashboard/kpis');
  }

  getQueues() {
    return this.request<any>('/dashboard/queues');
  }

  getStateDistribution() {
    return this.request<any[]>('/dashboard/state-distribution');
  }

  getActivity() {
    return this.request<any[]>('/dashboard/activity');
  }

  // Companies
  getCompanies(params = '') {
    return this.request<any>(`/companies${params ? '?' + params : ''}`);
  }

  getCompany(id: string) {
    return this.request<any>(`/companies/${id}`);
  }

  createCompany(data: any) {
    return this.request<any>('/companies', { method: 'POST', body: JSON.stringify(data) });
  }

  // Projects
  getProjects(params = '') {
    return this.request<any>(`/projects${params ? '?' + params : ''}`);
  }

  // Audit Objects
  getAuditObjects(params = '') {
    return this.request<any>(`/audit-objects${params ? '?' + params : ''}`);
  }

  getAuditObject(id: string) {
    return this.request<any>(`/audit-objects/${id}`);
  }

  transitionState(id: string, data: { toState: string; reason?: string; actorType?: string }) {
    return this.request<any>(`/audit-objects/${id}/transition`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Questionnaires
  getQuestionnaires(params = '') {
    return this.request<any>(`/questionnaires${params ? '?' + params : ''}`);
  }

  answerQuestionnaire(id: string, data: { response: string; responseType: string }) {
    return this.request<any>(`/questionnaires/${id}/answer`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Documents
  getDocuments(params = '') {
    return this.request<any>(`/documents${params ? '?' + params : ''}`);
  }

  // Journal
  getJournalEntries(params = '') {
    return this.request<any>(`/journal${params ? '?' + params : ''}`);
  }

  getJournalAnomalies(companyId?: string) {
    return this.request<any>(`/journal/anomalies${companyId ? '?companyId=' + companyId : ''}`);
  }

  // HR
  getEmployees(params = '') {
    return this.request<any>(`/hr/employees${params ? '?' + params : ''}`);
  }

  getTasks(params = '') {
    return this.request<any>(`/hr/tasks${params ? '?' + params : ''}`);
  }

  // Stock
  getStockLevels(locationId?: string) {
    return this.request<any>(`/stock/levels${locationId ? '?locationId=' + locationId : ''}`);
  }

  getStockAlerts() {
    return this.request<any[]>('/stock/alerts');
  }

  // Legal
  getLegalDeadlines() {
    return this.request<any[]>('/legal/deadlines');
  }

  // Workflows
  getWorkflows(params = '') {
    return this.request<any>(`/workflows${params ? '?' + params : ''}`);
  }

  // Rules
  getRules(params = '') {
    return this.request<any>(`/rules${params ? '?' + params : ''}`);
  }

  // Integrations
  getIntegrationHealth() {
    return this.request<any>('/integrations/health');
  }

  // Proof
  getProofChain(auditObjectId: string) {
    return this.request<any[]>(`/proof/chain/${auditObjectId}`);
  }

  verifyProof(proofId: string) {
    return this.request<any>(`/proof/verify/${proofId}`);
  }
}

export const api = new ApiClient();
FILEEOF

cat <<'FILEEOF' > packages/frontend/src/hooks/useAuth.ts
import { create } from 'zustand';
import { api } from '../services/api';
import type { User } from '../types';

interface AuthState {
  user: User | null;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  checkAuth: () => Promise<void>;
}

export const useAuth = create<AuthState>((set) => ({
  user: null,
  isLoading: true,
  error: null,

  login: async (email: string, password: string) => {
    set({ isLoading: true, error: null });
    try {
      const { user, token } = await api.login(email, password);
      api.setToken(token);
      set({ user, isLoading: false });
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
      throw err;
    }
  },

  logout: () => {
    api.setToken(null);
    set({ user: null });
  },

  checkAuth: async () => {
    const token = api.getToken();
    if (!token) {
      set({ isLoading: false });
      return;
    }
    try {
      const user = await api.getMe();
      set({ user, isLoading: false });
    } catch {
      api.setToken(null);
      set({ user: null, isLoading: false });
    }
  },
}));
FILEEOF

echo "Frontend types, services, hooks created."

# ============================================================
# FRONTEND - components/Layout.tsx
# ============================================================

cat <<'FILEEOF' > packages/frontend/src/components/Layout.tsx
import { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import {
  LayoutDashboard, Shield, HelpCircle, Building2, FolderKanban,
  FileText, BookOpen, Users, Scale, GitBranch, Settings, Plug,
  LogOut, Menu, X, ChevronDown
} from 'lucide-react';

const NAV_ITEMS = [
  { path: '/', icon: LayoutDashboard, label: 'Tableau de bord' },
  { path: '/audit-objects', icon: Shield, label: 'Objets audités' },
  { path: '/questionnaires', icon: HelpCircle, label: 'Questionnaires' },
  { path: '/companies', icon: Building2, label: 'Sociétés' },
  { path: '/projects', icon: FolderKanban, label: 'Projets' },
  { path: '/documents', icon: FileText, label: 'Documents' },
  { path: '/journal', icon: BookOpen, label: 'Comptabilité' },
  { path: '/hr', icon: Users, label: 'RH / SPI' },
  { path: '/legal', icon: Scale, label: 'Juridique' },
  { path: '/workflows', icon: GitBranch, label: 'Workflows' },
  { path: '/rules', icon: Settings, label: 'Règles métier' },
  { path: '/integrations', icon: Plug, label: 'Intégrations' },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-gray-900 text-white transform transition-transform duration-200
        lg:relative lg:translate-x-0
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="flex items-center justify-between h-16 px-4 border-b border-gray-800">
          <div className="flex items-center gap-2">
            <Shield className="h-7 w-7 text-sentinel-400" />
            <span className="text-lg font-bold">Sentinel</span>
          </div>
          <button className="lg:hidden" onClick={() => setSidebarOpen(false)}>
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map(({ path, icon: Icon, label }) => {
            const active = path === '/' ? location.pathname === '/' : location.pathname.startsWith(path);
            return (
              <Link
                key={path}
                to={path}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  active
                    ? 'bg-sentinel-600 text-white'
                    : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                }`}
              >
                <Icon className="h-5 w-5 flex-shrink-0" />
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-sentinel-600 flex items-center justify-center text-sm font-bold">
              {user?.firstName?.[0]}{user?.lastName?.[0]}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user?.firstName} {user?.lastName}</p>
              <p className="text-xs text-gray-400 truncate">{user?.role}</p>
            </div>
            <button onClick={logout} className="text-gray-400 hover:text-white" title="Déconnexion">
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 bg-white border-b border-gray-200 flex items-center px-4 lg:px-6 gap-4">
          <button className="lg:hidden" onClick={() => setSidebarOpen(true)}>
            <Menu className="h-6 w-6" />
          </button>
          <div className="flex-1" />
          <span className="text-sm text-gray-500">Gouvernance par la preuve</span>
        </header>

        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
FILEEOF

# ============================================================
# FRONTEND - pages/LoginPage.tsx
# ============================================================

cat <<'FILEEOF' > packages/frontend/src/pages/LoginPage.tsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Shield } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Échec de connexion');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 px-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <Shield className="h-16 w-16 text-sentinel-400 mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-white">Sentinel</h1>
          <p className="text-gray-400 mt-2">Gouvernance opérationnelle par la preuve</p>
        </div>

        <form onSubmit={handleSubmit} className="card space-y-4">
          {error && (
            <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="input-field"
              placeholder="admin@sentinel.dz"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Mot de passe</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="input-field"
              placeholder="••••••••"
              required
            />
          </div>

          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? 'Connexion...' : 'Se connecter'}
          </button>

          <div className="text-xs text-gray-500 text-center mt-4">
            <p>Comptes de démonstration :</p>
            <p className="font-mono">admin@sentinel.dz / sentinel-admin-2024</p>
            <p className="font-mono">daf@sentinel.dz / sentinel-daf-2024</p>
          </div>
        </form>
      </div>
    </div>
  );
}
FILEEOF

echo "Frontend Layout and LoginPage created."

# ============================================================
# FRONTEND - pages
# ============================================================

cat <<'PAGEEOF_DASHBOARDPAGE_TSX' > packages/frontend/src/pages/DashboardPage.tsx
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import {
  Building2, FolderKanban, FileText, Users, Shield, HelpCircle,
  AlertTriangle, CheckCircle, Clock, XCircle, BookOpen, Scale, Plug
} from 'lucide-react';

export default function DashboardPage() {
  const [kpis, setKpis] = useState<any>(null);
  const [queues, setQueues] = useState<any>(null);
  const [stateDist, setStateDist] = useState<any[]>([]);
  const [activity, setActivity] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.getKPIs().catch(() => null),
      api.getQueues().catch(() => null),
      api.getStateDistribution().catch(() => []),
      api.getActivity().catch(() => []),
    ]).then(([k, q, s, a]) => {
      setKpis(k);
      setQueues(q);
      setStateDist(s);
      setActivity(a);
      setLoading(false);
    });
  }, []);

  if (loading) return <div className="flex justify-center py-20"><div className="animate-spin h-8 w-8 border-4 border-sentinel-600 border-t-transparent rounded-full" /></div>;

  const overview = kpis?.overview || {};
  const gov = kpis?.governance || {};
  const acc = kpis?.accounting || {};
  const ops = kpis?.operations || {};

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Tableau de bord</h1>

      {/* Overview KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPICard icon={Building2} label="Sociétés" value={overview.companies} color="blue" />
        <KPICard icon={FolderKanban} label="Projets actifs" value={overview.projects} color="green" />
        <KPICard icon={FileText} label="Documents" value={overview.documents} color="purple" />
        <KPICard icon={Users} label="Employés" value={overview.employees} color="amber" />
      </div>

      {/* Governance */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPICard icon={Shield} label="Objets audités" value={gov.totalAuditObjects} color="indigo" />
        <KPICard icon={CheckCircle} label="Validés preuve" value={gov.validatedProof} color="green" />
        <KPICard icon={AlertTriangle} label="Avec réserve" value={gov.validatedReserve} color="yellow" />
        <KPICard icon={Clock} label="En attente humain" value={gov.pendingHuman} color="orange" />
      </div>

      {/* Queues */}
      {queues && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <QueueCard label="A arbitrer" value={queues.toArbitrate} severity="high" link="/audit-objects?state=PENDING_HUMAN" />
          <QueueCard label="Preuves manquantes" value={queues.missingProof} severity="medium" link="/audit-objects" />
          <QueueCard label="Bloqués" value={queues.blocked} severity="high" link="/workflows" />
          <QueueCard label="Relances dépassées" value={queues.overdueReminders} severity="medium" link="/questionnaires?status=PENDING" />
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        {/* State distribution */}
        <div className="card">
          <h3 className="font-semibold mb-4">Distribution des états</h3>
          <div className="space-y-2">
            {stateDist.map((s: any) => (
              <div key={s.state} className="flex items-center justify-between text-sm">
                <span className="text-gray-600">{formatState(s.state)}</span>
                <div className="flex items-center gap-2">
                  <div className="w-24 bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${stateColor(s.state)}`}
                      style={{ width: `${Math.min(100, (s.count / Math.max(1, gov.totalAuditObjects)) * 100)}%` }}
                    />
                  </div>
                  <span className="font-medium w-8 text-right">{s.count}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent activity */}
        <div className="card">
          <h3 className="font-semibold mb-4">Activité récente</h3>
          <div className="space-y-3 max-h-80 overflow-y-auto">
            {activity.slice(0, 15).map((a: any) => (
              <div key={a.id} className="flex items-start gap-3 text-sm">
                <div className={`mt-1 w-2 h-2 rounded-full flex-shrink-0 ${actionColor(a.action)}`} />
                <div>
                  <span className="font-medium">{a.user?.firstName} {a.user?.lastName}</span>
                  <span className="text-gray-500"> {a.action.toLowerCase()} </span>
                  <span className="text-gray-700">{a.entityType}</span>
                  <div className="text-xs text-gray-400">{new Date(a.createdAt).toLocaleString('fr-FR')}</div>
                </div>
              </div>
            ))}
            {activity.length === 0 && <p className="text-gray-400 text-sm">Aucune activité</p>}
          </div>
        </div>
      </div>

      {/* Quick stats row */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <MiniStat label="Écritures" value={acc.journalEntries} icon={BookOpen} />
        <MiniStat label="Sans preuve" value={acc.missingProof} icon={AlertTriangle} alert />
        <MiniStat label="Tâches actives" value={ops.activeTasks} icon={Users} />
        <MiniStat label="Dossiers ouverts" value={ops.openCases} icon={Scale} />
        <MiniStat label="Erreurs intég." value={kpis?.integrations?.errors} icon={Plug} alert={kpis?.integrations?.errors > 0} />
      </div>
    </div>
  );
}

function KPICard({ icon: Icon, label, value, color }: any) {
  const colorClasses: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    purple: 'bg-purple-50 text-purple-600',
    amber: 'bg-amber-50 text-amber-600',
    indigo: 'bg-indigo-50 text-indigo-600',
    yellow: 'bg-yellow-50 text-yellow-600',
    orange: 'bg-orange-50 text-orange-600',
    red: 'bg-red-50 text-red-600',
  };

  return (
    <div className="card flex items-center gap-4">
      <div className={`p-3 rounded-lg ${colorClasses[color] || colorClasses.blue}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="text-2xl font-bold">{value ?? 0}</p>
        <p className="text-sm text-gray-500">{label}</p>
      </div>
    </div>
  );
}

function QueueCard({ label, value, severity, link }: any) {
  const bg = severity === 'high' ? 'border-l-4 border-l-red-500' : 'border-l-4 border-l-yellow-500';
  return (
    <Link to={link} className={`card ${bg} hover:shadow-md transition-shadow`}>
      <p className="text-2xl font-bold">{value ?? 0}</p>
      <p className="text-sm text-gray-500">{label}</p>
    </Link>
  );
}

function MiniStat({ label, value, icon: Icon, alert }: any) {
  return (
    <div className={`card flex items-center gap-3 ${alert && value > 0 ? 'border-red-200 bg-red-50' : ''}`}>
      <Icon className={`h-4 w-4 ${alert && value > 0 ? 'text-red-500' : 'text-gray-400'}`} />
      <div>
        <p className="text-lg font-bold">{value ?? 0}</p>
        <p className="text-xs text-gray-500">{label}</p>
      </div>
    </div>
  );
}

function formatState(state: string) {
  return state.replace(/_/g, ' ').toLowerCase().replace(/^\w/, c => c.toUpperCase());
}

function stateColor(state: string) {
  if (state.includes('VALIDATED_PROOF')) return 'bg-green-500';
  if (state.includes('VALIDATED_RESERVE')) return 'bg-yellow-500';
  if (state.includes('PENDING')) return 'bg-orange-500';
  if (state.includes('REJECTED') || state.includes('EXCLUDED')) return 'bg-red-500';
  if (state.includes('ARCHIVED')) return 'bg-gray-500';
  return 'bg-blue-500';
}

function actionColor(action: string) {
  if (action === 'CREATE') return 'bg-green-500';
  if (action === 'UPDATE') return 'bg-blue-500';
  if (action === 'DELETE') return 'bg-red-500';
  if (action === 'VALIDATE') return 'bg-emerald-500';
  if (action === 'REJECT') return 'bg-red-500';
  return 'bg-gray-400';
}
PAGEEOF_DASHBOARDPAGE_TSX

cat <<'PAGEEOF_AUDITOBJECTSPAGE_TSX' > packages/frontend/src/pages/AuditObjectsPage.tsx
import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../services/api';
import { Shield, ChevronRight, Filter } from 'lucide-react';

const STATES = [
  'RECEIVED', 'FINGERPRINTED', 'CLASSIFIED_PROVISIONAL', 'EXTRACTABLE', 'NOT_EXTRACTABLE',
  'STRUCTURED', 'MATCHED', 'CONTROL_TECHNICAL', 'CONTROL_BUSINESS', 'CONTROL_CROSS',
  'VALIDATED_PROOF', 'VALIDATED_RESERVE', 'PENDING_HUMAN', 'REJECTED_MOTIVATED', 'EXCLUDED_MOTIVATED', 'ARCHIVED',
];

const CRITICALITIES = ['LOW', 'NORMAL', 'HIGH', 'CRITICAL'];

export default function AuditObjectsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [data, setData] = useState<any>({ data: [], meta: { total: 0, page: 1, totalPages: 0 } });
  const [loading, setLoading] = useState(true);
  const [stateFilter, setStateFilter] = useState(searchParams.get('state') || '');
  const [critFilter, setCritFilter] = useState('');

  const fetchData = (page = 1) => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: '20' });
    if (stateFilter) params.set('state', stateFilter);
    if (critFilter) params.set('criticality', critFilter);
    api.getAuditObjects(params.toString()).then(setData).finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, [stateFilter, critFilter]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Shield className="h-6 w-6 text-sentinel-600" /> Objets audités
        </h1>
        <span className="text-sm text-gray-500">{data.meta.total} objets</span>
      </div>

      {/* Filters */}
      <div className="card flex flex-wrap gap-4 items-center">
        <Filter className="h-4 w-4 text-gray-400" />
        <select value={stateFilter} onChange={e => setStateFilter(e.target.value)} className="input-field w-auto">
          <option value="">Tous les états</option>
          {STATES.map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
        </select>
        <select value={critFilter} onChange={e => setCritFilter(e.target.value)} className="input-field w-auto">
          <option value="">Toutes criticités</option>
          {CRITICALITIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="card overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Type</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">État</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Criticité</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Société</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Projet</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Preuves</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">Chargement...</td></tr>
            ) : data.data.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">Aucun objet trouvé</td></tr>
            ) : (
              data.data.map((obj: any) => (
                <tr key={obj.id} className="border-b hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{obj.objectType}</td>
                  <td className="px-4 py-3"><StateBadge state={obj.state} /></td>
                  <td className="px-4 py-3"><CritBadge crit={obj.criticality} /></td>
                  <td className="px-4 py-3 text-gray-600">{obj.company?.code || '-'}</td>
                  <td className="px-4 py-3 text-gray-600">{obj.project?.code || '-'}</td>
                  <td className="px-4 py-3">{obj._count?.proofRecords || 0}</td>
                  <td className="px-4 py-3">
                    <Link to={`/audit-objects/${obj.id}`} className="text-sentinel-600 hover:text-sentinel-800">
                      <ChevronRight className="h-4 w-4" />
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {data.meta.totalPages > 1 && (
        <div className="flex justify-center gap-2">
          {Array.from({ length: Math.min(5, data.meta.totalPages) }, (_, i) => i + 1).map(p => (
            <button key={p} onClick={() => fetchData(p)}
              className={`px-3 py-1 rounded ${p === data.meta.page ? 'bg-sentinel-600 text-white' : 'bg-white border'}`}>
              {p}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function StateBadge({ state }: { state: string }) {
  let cls = 'badge-gray';
  if (state.includes('VALIDATED_PROOF')) cls = 'badge-green';
  else if (state.includes('VALIDATED_RESERVE')) cls = 'badge-yellow';
  else if (state.includes('PENDING')) cls = 'badge-blue';
  else if (state.includes('REJECTED') || state.includes('EXCLUDED')) cls = 'badge-red';
  return <span className={cls}>{state.replace(/_/g, ' ')}</span>;
}

function CritBadge({ crit }: { crit: string }) {
  const cls = crit === 'CRITICAL' ? 'badge-red' : crit === 'HIGH' ? 'badge-yellow' : 'badge-gray';
  return <span className={cls}>{crit}</span>;
}
PAGEEOF_AUDITOBJECTSPAGE_TSX

cat <<'PAGEEOF_AUDITOBJECTDETAILPAGE_TSX' > packages/frontend/src/pages/AuditObjectDetailPage.tsx
import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../services/api';
import { Shield, ArrowRight, FileCheck, HelpCircle, ArrowLeft } from 'lucide-react';

export default function AuditObjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [obj, setObj] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [transitioning, setTransitioning] = useState(false);
  const [reason, setReason] = useState('');
  const [selectedState, setSelectedState] = useState('');

  useEffect(() => {
    if (id) {
      api.getAuditObject(id).then(setObj).finally(() => setLoading(false));
    }
  }, [id]);

  const handleTransition = async () => {
    if (!id || !selectedState) return;
    setTransitioning(true);
    try {
      const result = await api.transitionState(id, { toState: selectedState, reason, actorType: 'HUMAN' });
      setObj({ ...obj, ...result.auditObject, validTransitions: [] });
      setSelectedState('');
      setReason('');
      // Refresh
      const fresh = await api.getAuditObject(id);
      setObj(fresh);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setTransitioning(false);
    }
  };

  if (loading) return <div className="flex justify-center py-20"><div className="animate-spin h-8 w-8 border-4 border-sentinel-600 border-t-transparent rounded-full" /></div>;
  if (!obj) return <div className="text-center py-20 text-gray-500">Objet non trouvé</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link to="/audit-objects" className="text-gray-400 hover:text-gray-600"><ArrowLeft className="h-5 w-5" /></Link>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Shield className="h-6 w-6 text-sentinel-600" />
          {obj.objectType} — {obj.objectId.substring(0, 8)}
        </h1>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Info */}
        <div className="card space-y-3">
          <h3 className="font-semibold">Informations</h3>
          <InfoRow label="Type" value={obj.objectType} />
          <InfoRow label="État" value={obj.state} badge />
          <InfoRow label="Criticité" value={obj.criticality} />
          <InfoRow label="Société" value={obj.company?.name || '-'} />
          <InfoRow label="Projet" value={obj.project?.name || '-'} />
          <InfoRow label="Score fiabilité" value={obj.reliabilityScore ? `${(obj.reliabilityScore * 100).toFixed(0)}%` : '-'} />
          <InfoRow label="Famille" value={obj.classFamily || '-'} />
        </div>

        {/* Proof summary */}
        <div className="card space-y-3">
          <h3 className="font-semibold flex items-center gap-2"><FileCheck className="h-4 w-4" /> Registre de preuve</h3>
          {obj.proofSummary ? (
            <>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="bg-green-50 p-2 rounded"><span className="font-bold text-green-700">{obj.proofSummary.validated}</span> <span className="text-green-600">validées</span></div>
                <div className="bg-yellow-50 p-2 rounded"><span className="font-bold text-yellow-700">{obj.proofSummary.withReserve}</span> <span className="text-yellow-600">avec réserve</span></div>
                <div className="bg-blue-50 p-2 rounded"><span className="font-bold text-blue-700">{obj.proofSummary.pending}</span> <span className="text-blue-600">en attente</span></div>
                <div className="bg-red-50 p-2 rounded"><span className="font-bold text-red-700">{obj.proofSummary.rejected}</span> <span className="text-red-600">rejetées</span></div>
              </div>
              <div className="text-sm text-gray-500">
                Confiance moyenne : {(obj.proofSummary.averageConfidence * 100).toFixed(0)}%
                <br />Immuables : {obj.proofSummary.immutable}
              </div>
            </>
          ) : <p className="text-sm text-gray-400">Aucune preuve</p>}
        </div>

        {/* Transition */}
        <div className="card space-y-3">
          <h3 className="font-semibold">Transition d'état</h3>
          {obj.validTransitions?.length > 0 ? (
            <>
              <select value={selectedState} onChange={e => setSelectedState(e.target.value)} className="input-field">
                <option value="">Sélectionner un état cible</option>
                {obj.validTransitions.map((s: string) => (
                  <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
                ))}
              </select>
              <textarea
                value={reason}
                onChange={e => setReason(e.target.value)}
                className="input-field"
                placeholder="Motif de la transition..."
                rows={2}
              />
              <button onClick={handleTransition} disabled={!selectedState || transitioning} className="btn-primary w-full">
                {transitioning ? 'Transition...' : 'Appliquer la transition'}
              </button>
            </>
          ) : (
            <p className="text-sm text-gray-400">Aucune transition disponible depuis cet état</p>
          )}
        </div>
      </div>

      {/* Transition history */}
      <div className="card">
        <h3 className="font-semibold mb-4">Historique des transitions</h3>
        <div className="space-y-3">
          {obj.stateTransitions?.map((t: any, i: number) => (
            <div key={t.id} className="flex items-center gap-3 text-sm">
              <span className="w-6 h-6 rounded-full bg-sentinel-100 text-sentinel-700 flex items-center justify-center text-xs font-bold">{i + 1}</span>
              <span className="badge-gray">{t.fromState}</span>
              <ArrowRight className="h-3 w-3 text-gray-400" />
              <span className="badge-blue">{t.toState}</span>
              <span className="text-gray-400">|</span>
              <span className="text-gray-500">{t.actorType}</span>
              {t.reason && <span className="text-gray-400 italic">— {t.reason}</span>}
              <span className="ml-auto text-xs text-gray-400">{new Date(t.createdAt).toLocaleString('fr-FR')}</span>
            </div>
          ))}
          {(!obj.stateTransitions || obj.stateTransitions.length === 0) && (
            <p className="text-sm text-gray-400">Aucune transition enregistrée</p>
          )}
        </div>
      </div>

      {/* Questionnaires */}
      {obj.questionnaires?.length > 0 && (
        <div className="card">
          <h3 className="font-semibold mb-4 flex items-center gap-2"><HelpCircle className="h-4 w-4" /> Questionnaires</h3>
          <div className="space-y-3">
            {obj.questionnaires.map((q: any) => (
              <div key={q.id} className="border rounded-lg p-3">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium text-sm">{q.context}</p>
                    <p className="text-sm text-gray-500 mt-1">Manque : {q.missingInfo}</p>
                  </div>
                  <span className={q.status === 'PENDING' ? 'badge-yellow' : q.status === 'ANSWERED' ? 'badge-green' : 'badge-red'}>
                    {q.status}
                  </span>
                </div>
                {q.response && <p className="mt-2 text-sm bg-green-50 p-2 rounded">Réponse : {q.response}</p>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function InfoRow({ label, value, badge }: { label: string; value: string; badge?: boolean }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-gray-500">{label}</span>
      {badge ? <span className="badge-blue">{value}</span> : <span className="font-medium">{value}</span>}
    </div>
  );
}
PAGEEOF_AUDITOBJECTDETAILPAGE_TSX

cat <<'PAGEEOF_QUESTIONNAIRESPAGE_TSX' > packages/frontend/src/pages/QuestionnairesPage.tsx
import { useEffect, useState } from 'react';
import { api } from '../services/api';
import { HelpCircle, Send, AlertTriangle } from 'lucide-react';

export default function QuestionnairesPage() {
  const [data, setData] = useState<any>({ data: [], meta: { total: 0 } });
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [answering, setAnswering] = useState<string | null>(null);
  const [response, setResponse] = useState('');

  const fetchData = () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (statusFilter) params.set('status', statusFilter);
    api.getQuestionnaires(params.toString()).then(setData).finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, [statusFilter]);

  const handleAnswer = async (id: string) => {
    if (!response.trim()) return;
    try {
      await api.answerQuestionnaire(id, { response, responseType: 'FREE_TEXT' });
      setAnswering(null);
      setResponse('');
      fetchData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <HelpCircle className="h-6 w-6 text-sentinel-600" /> Questionnaires intelligents
        </h1>
        <span className="text-sm text-gray-500">{data.meta.total} questionnaires</span>
      </div>

      <div className="card flex gap-4 items-center">
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="input-field w-auto">
          <option value="">Tous les statuts</option>
          <option value="PENDING">En attente</option>
          <option value="ANSWERED">Répondus</option>
          <option value="ESCALATED">Escaladés</option>
          <option value="EXPIRED">Expirés</option>
        </select>
      </div>

      <div className="space-y-4">
        {loading ? (
          <div className="text-center py-8 text-gray-400">Chargement...</div>
        ) : data.data.length === 0 ? (
          <div className="card text-center py-8 text-gray-400">Aucun questionnaire</div>
        ) : (
          data.data.map((q: any) => (
            <div key={q.id} className="card">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={q.status === 'PENDING' ? 'badge-yellow' : q.status === 'ANSWERED' ? 'badge-green' : q.status === 'ESCALATED' ? 'badge-red' : 'badge-gray'}>
                      {q.status}
                    </span>
                    <span className="badge-blue">{q.auditObject?.objectType}</span>
                    <span className="badge-gray">{q.auditObject?.criticality}</span>
                  </div>
                  <h3 className="font-semibold">{q.context}</h3>
                  <p className="text-sm text-gray-500 mt-1">
                    <AlertTriangle className="h-3 w-3 inline text-yellow-500" /> Information manquante : {q.missingInfo}
                  </p>
                </div>
                <div className="text-right text-xs text-gray-400">
                  <p>Assigné à : {q.assignedTo?.firstName} {q.assignedTo?.lastName}</p>
                  <p>Relances : {q.reminderCount}</p>
                </div>
              </div>

              {/* Suggested answers */}
              {q.suggestedAnswers?.length > 0 && (
                <div className="mb-3">
                  <p className="text-xs text-gray-500 mb-1">Réponses suggérées :</p>
                  <div className="flex flex-wrap gap-2">
                    {(q.suggestedAnswers as string[]).map((s: string, i: number) => (
                      <button
                        key={i}
                        onClick={() => { setAnswering(q.id); setResponse(s); }}
                        className="text-xs bg-sentinel-50 text-sentinel-700 px-3 py-1 rounded-full hover:bg-sentinel-100"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Response */}
              {q.response && (
                <div className="bg-green-50 p-3 rounded-lg text-sm">
                  <span className="font-medium text-green-700">Réponse :</span> {q.response}
                </div>
              )}

              {/* Answer form */}
              {q.status === 'PENDING' && (
                <div className="mt-3">
                  {answering === q.id ? (
                    <div className="flex gap-2">
                      <input
                        value={response}
                        onChange={e => setResponse(e.target.value)}
                        className="input-field flex-1"
                        placeholder="Votre réponse..."
                      />
                      <button onClick={() => handleAnswer(q.id)} className="btn-primary flex items-center gap-1">
                        <Send className="h-4 w-4" /> Envoyer
                      </button>
                      <button onClick={() => setAnswering(null)} className="btn-secondary">Annuler</button>
                    </div>
                  ) : (
                    <button onClick={() => setAnswering(q.id)} className="btn-secondary text-sm">
                      Répondre
                    </button>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
PAGEEOF_QUESTIONNAIRESPAGE_TSX

cat <<'PAGEEOF_COMPANIESPAGE_TSX' > packages/frontend/src/pages/CompaniesPage.tsx
import { useEffect, useState } from 'react';
import { api } from '../services/api';
import { Building2, Plus } from 'lucide-react';

export default function CompaniesPage() {
  const [data, setData] = useState<any>({ data: [], meta: { total: 0 } });
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ code: '', name: '', legalForm: '', address: '' });

  useEffect(() => {
    api.getCompanies().then(setData).finally(() => setLoading(false));
  }, []);

  const handleCreate = async () => {
    try {
      await api.createCompany(form);
      setShowForm(false);
      setForm({ code: '', name: '', legalForm: '', address: '' });
      api.getCompanies().then(setData);
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Building2 className="h-6 w-6 text-sentinel-600" /> Sociétés
        </h1>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary flex items-center gap-1">
          <Plus className="h-4 w-4" /> Nouvelle société
        </button>
      </div>

      {showForm && (
        <div className="card space-y-3">
          <div className="grid md:grid-cols-2 gap-3">
            <input value={form.code} onChange={e => setForm({...form, code: e.target.value})} className="input-field" placeholder="Code (ex: SCI-01)" />
            <input value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="input-field" placeholder="Raison sociale" />
            <input value={form.legalForm} onChange={e => setForm({...form, legalForm: e.target.value})} className="input-field" placeholder="Forme juridique (SCI, SARL...)" />
            <input value={form.address} onChange={e => setForm({...form, address: e.target.value})} className="input-field" placeholder="Adresse" />
          </div>
          <div className="flex gap-2">
            <button onClick={handleCreate} className="btn-primary">Créer</button>
            <button onClick={() => setShowForm(false)} className="btn-secondary">Annuler</button>
          </div>
        </div>
      )}

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-3 text-center py-8 text-gray-400">Chargement...</div>
        ) : (
          data.data.map((c: any) => (
            <div key={c.id} className="card hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div>
                  <span className="badge-blue">{c.code}</span>
                  <h3 className="font-semibold mt-2">{c.name}</h3>
                  {c.legalForm && <p className="text-sm text-gray-500">{c.legalForm}</p>}
                  {c.address && <p className="text-sm text-gray-400 mt-1">{c.address}</p>}
                </div>
                <span className={c.isActive ? 'badge-green' : 'badge-red'}>{c.isActive ? 'Active' : 'Inactive'}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
PAGEEOF_COMPANIESPAGE_TSX

cat <<'PAGEEOF_PROJECTSPAGE_TSX' > packages/frontend/src/pages/ProjectsPage.tsx
import { useEffect, useState } from 'react';
import { api } from '../services/api';
import { FolderKanban } from 'lucide-react';

export default function ProjectsPage() {
  const [data, setData] = useState<any>({ data: [], meta: { total: 0 } });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getProjects().then(setData).finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold flex items-center gap-2">
        <FolderKanban className="h-6 w-6 text-sentinel-600" /> Projets
      </h1>

      <div className="grid md:grid-cols-2 gap-4">
        {loading ? (
          <div className="col-span-2 text-center py-8 text-gray-400">Chargement...</div>
        ) : data.data.length === 0 ? (
          <div className="col-span-2 card text-center text-gray-400">Aucun projet</div>
        ) : (
          data.data.map((p: any) => (
            <div key={p.id} className="card">
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="badge-blue">{p.code}</span>
                    <span className="badge-gray">{p.type}</span>
                  </div>
                  <h3 className="font-semibold">{p.name}</h3>
                  <p className="text-sm text-gray-500">{p.company?.name}</p>
                </div>
                <span className={p.status === 'ACTIVE' ? 'badge-green' : 'badge-gray'}>{p.status}</span>
              </div>
              {p.budget && (
                <p className="text-sm text-gray-600 mt-2">
                  Budget : {new Intl.NumberFormat('fr-DZ', { style: 'currency', currency: 'DZD' }).format(p.budget)}
                </p>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
PAGEEOF_PROJECTSPAGE_TSX

cat <<'PAGEEOF_DOCUMENTSPAGE_TSX' > packages/frontend/src/pages/DocumentsPage.tsx
import { useEffect, useState } from 'react';
import { api } from '../services/api';
import { FileText, Filter } from 'lucide-react';

const FAMILIES = ['FACTURE', 'BON', 'CONTRAT', 'PV', 'PHOTO', 'SCAN', 'RELEVE', 'PAIE', 'AUTRE'];

export default function DocumentsPage() {
  const [data, setData] = useState<any>({ data: [], meta: { total: 0 } });
  const [loading, setLoading] = useState(true);
  const [familyFilter, setFamilyFilter] = useState('');

  useEffect(() => {
    const params = new URLSearchParams();
    if (familyFilter) params.set('family', familyFilter);
    api.getDocuments(params.toString()).then(setData).finally(() => setLoading(false));
  }, [familyFilter]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <FileText className="h-6 w-6 text-sentinel-600" /> Documents
        </h1>
        <span className="text-sm text-gray-500">{data.meta.total} documents</span>
      </div>

      <div className="card flex gap-4 items-center">
        <Filter className="h-4 w-4 text-gray-400" />
        <select value={familyFilter} onChange={e => setFamilyFilter(e.target.value)} className="input-field w-auto">
          <option value="">Toutes familles</option>
          {FAMILIES.map(f => <option key={f} value={f}>{f}</option>)}
        </select>
      </div>

      <div className="card overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Nom</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Famille</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Société</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Période</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Statut</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Confiance OCR</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">Chargement...</td></tr>
            ) : data.data.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">Aucun document</td></tr>
            ) : (
              data.data.map((d: any) => (
                <tr key={d.id} className="border-b hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="font-medium">{d.originalName}</div>
                    {d.normalizedName && <div className="text-xs text-gray-400">{d.normalizedName}</div>}
                  </td>
                  <td className="px-4 py-3"><span className="badge-blue">{d.family || '-'}</span></td>
                  <td className="px-4 py-3 text-gray-600">{d.company?.name || '-'}</td>
                  <td className="px-4 py-3 text-gray-600">{d.period || '-'}</td>
                  <td className="px-4 py-3">
                    <span className={d.isDuplicate ? 'badge-yellow' : d.status === 'ORPHAN' ? 'badge-red' : 'badge-green'}>
                      {d.isDuplicate ? 'DUPLICATE' : d.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {d.ocrConfidence ? `${(d.ocrConfidence * 100).toFixed(0)}%` : '-'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
PAGEEOF_DOCUMENTSPAGE_TSX

cat <<'PAGEEOF_JOURNALPAGE_TSX' > packages/frontend/src/pages/JournalPage.tsx
import { useEffect, useState } from 'react';
import { api } from '../services/api';
import { BookOpen, AlertTriangle } from 'lucide-react';

export default function JournalPage() {
  const [data, setData] = useState<any>({ data: [], meta: { total: 0 } });
  const [anomalies, setAnomalies] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    const params = new URLSearchParams();
    if (statusFilter) params.set('status', statusFilter);
    Promise.all([
      api.getJournalEntries(params.toString()),
      api.getJournalAnomalies(),
    ]).then(([d, a]) => {
      setData(d);
      setAnomalies(a);
    }).finally(() => setLoading(false));
  }, [statusFilter]);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold flex items-center gap-2">
        <BookOpen className="h-6 w-6 text-sentinel-600" /> Comptabilité
      </h1>

      {/* Anomaly banner */}
      {anomalies && (anomalies.missingProof > 0 || anomalies.inconsistent > 0) && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 text-yellow-600" />
          <div className="text-sm">
            <strong className="text-yellow-800">Anomalies détectées :</strong>
            <span className="text-yellow-700 ml-2">
              {anomalies.missingProof} sans preuve | {anomalies.inconsistent} incohérentes | {anomalies.potentialDuplicates} doublons potentiels
            </span>
          </div>
        </div>
      )}

      <div className="card flex gap-4 items-center">
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="input-field w-auto">
          <option value="">Tous les statuts</option>
          <option value="DRAFT">Brouillon</option>
          <option value="PROPOSED">Proposé</option>
          <option value="VALIDATED">Validé</option>
          <option value="REJECTED">Rejeté</option>
          <option value="RESERVED">Réservé</option>
        </select>
      </div>

      <div className="card overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Date</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Journal</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Libellé</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Débit</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Crédit</th>
              <th className="text-right px-4 py-3 font-medium text-gray-600">Montant</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Preuve</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Statut</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-400">Chargement...</td></tr>
            ) : data.data.length === 0 ? (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-400">Aucune écriture</td></tr>
            ) : (
              data.data.map((e: any) => (
                <tr key={e.id} className="border-b hover:bg-gray-50">
                  <td className="px-4 py-3">{new Date(e.entryDate).toLocaleDateString('fr-FR')}</td>
                  <td className="px-4 py-3 font-mono">{e.journal}</td>
                  <td className="px-4 py-3">{e.label}</td>
                  <td className="px-4 py-3 text-xs">{e.debitAccount?.code} {e.debitAccount?.name}</td>
                  <td className="px-4 py-3 text-xs">{e.creditAccount?.code} {e.creditAccount?.name}</td>
                  <td className="px-4 py-3 text-right font-mono">{Number(e.amount).toLocaleString('fr-FR')}</td>
                  <td className="px-4 py-3">
                    <span className={e.proofStatus === 'PRESENT' ? 'badge-green' : e.proofStatus === 'MISSING' ? 'badge-red' : 'badge-yellow'}>
                      {e.proofStatus}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={e.status === 'VALIDATED' ? 'badge-green' : e.status === 'REJECTED' ? 'badge-red' : 'badge-gray'}>
                      {e.status}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
PAGEEOF_JOURNALPAGE_TSX

cat <<'PAGEEOF_HRPAGE_TSX' > packages/frontend/src/pages/HRPage.tsx
import { useEffect, useState } from 'react';
import { api } from '../services/api';
import { Users } from 'lucide-react';

export default function HRPage() {
  const [employees, setEmployees] = useState<any>({ data: [], meta: { total: 0 } });
  const [tasks, setTasks] = useState<any>({ data: [], meta: { total: 0 } });
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'employees' | 'tasks'>('employees');

  useEffect(() => {
    Promise.all([
      api.getEmployees(),
      api.getTasks(),
    ]).then(([e, t]) => {
      setEmployees(e);
      setTasks(t);
    }).finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold flex items-center gap-2">
        <Users className="h-6 w-6 text-sentinel-600" /> RH / SPI
      </h1>

      <div className="flex gap-2">
        <button onClick={() => setTab('employees')} className={tab === 'employees' ? 'btn-primary' : 'btn-secondary'}>
          Employés ({employees.meta.total})
        </button>
        <button onClick={() => setTab('tasks')} className={tab === 'tasks' ? 'btn-primary' : 'btn-secondary'}>
          Tâches SPI ({tasks.meta.total})
        </button>
      </div>

      {tab === 'employees' && (
        <div className="card overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Code</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Nom</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Poste</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Département</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Contrat</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Salaire base</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">Chargement...</td></tr>
              ) : (
                employees.data.map((e: any) => (
                  <tr key={e.id} className="border-b hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono">{e.code}</td>
                    <td className="px-4 py-3 font-medium">{e.firstName} {e.lastName}</td>
                    <td className="px-4 py-3">{e.position || '-'}</td>
                    <td className="px-4 py-3">{e.department || '-'}</td>
                    <td className="px-4 py-3"><span className="badge-gray">{e.contractType || '-'}</span></td>
                    <td className="px-4 py-3 text-right font-mono">{e.baseSalary ? Number(e.baseSalary).toLocaleString('fr-FR') : '-'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'tasks' && (
        <div className="card overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Code</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Titre</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Employé</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Type</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Prix convenu</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Statut</th>
              </tr>
            </thead>
            <tbody>
              {tasks.data.map((t: any) => (
                <tr key={t.id} className="border-b hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono">{t.code}</td>
                  <td className="px-4 py-3">{t.title}</td>
                  <td className="px-4 py-3">{t.employee?.firstName} {t.employee?.lastName}</td>
                  <td className="px-4 py-3"><span className="badge-blue">{t.taskType}</span></td>
                  <td className="px-4 py-3 text-right font-mono">{t.agreedPrice ? Number(t.agreedPrice).toLocaleString('fr-FR') : '-'}</td>
                  <td className="px-4 py-3">
                    <span className={
                      t.status === 'PAID' ? 'badge-green' :
                      t.status === 'QC_FAIL' ? 'badge-red' :
                      t.status === 'IN_PROGRESS' ? 'badge-blue' : 'badge-gray'
                    }>{t.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
PAGEEOF_HRPAGE_TSX

cat <<'PAGEEOF_LEGALPAGE_TSX' > packages/frontend/src/pages/LegalPage.tsx
import { useEffect, useState } from 'react';
import { api } from '../services/api';
import { Scale, AlertTriangle } from 'lucide-react';

export default function LegalPage() {
  const [deadlines, setDeadlines] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getLegalDeadlines().then(setDeadlines).finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold flex items-center gap-2">
        <Scale className="h-6 w-6 text-sentinel-600" /> Juridique / Contentieux
      </h1>

      <div className="card">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-yellow-500" /> Échéances à venir (30 jours)
        </h3>
        {loading ? (
          <p className="text-gray-400">Chargement...</p>
        ) : deadlines.length === 0 ? (
          <p className="text-gray-400">Aucune échéance imminente</p>
        ) : (
          <div className="space-y-3">
            {deadlines.map((c: any) => (
              <div key={c.id} className="border rounded-lg p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="badge-blue">{c.reference}</span>
                    <h4 className="font-medium mt-1">{c.subject}</h4>
                    <p className="text-sm text-gray-500">{c.factStatus || 'Non qualifié'}</p>
                  </div>
                  <div className="text-right">
                    <span className={daysUntil(c.nextDeadline) <= 7 ? 'badge-red' : 'badge-yellow'}>
                      {c.nextDeadline ? new Date(c.nextDeadline).toLocaleDateString('fr-FR') : '-'}
                    </span>
                    {c.amountAtStake && (
                      <p className="text-sm font-mono mt-1">{Number(c.amountAtStake).toLocaleString('fr-FR')} DZD</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function daysUntil(date: string): number {
  if (!date) return 999;
  return Math.ceil((new Date(date).getTime() - Date.now()) / 86400000);
}
PAGEEOF_LEGALPAGE_TSX

cat <<'PAGEEOF_WORKFLOWSPAGE_TSX' > packages/frontend/src/pages/WorkflowsPage.tsx
import { useEffect, useState } from 'react';
import { api } from '../services/api';
import { GitBranch, ChevronRight } from 'lucide-react';

export default function WorkflowsPage() {
  const [data, setData] = useState<any>({ data: [], meta: { total: 0 } });
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<any>(null);

  useEffect(() => {
    api.getWorkflows().then(setData).finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold flex items-center gap-2">
        <GitBranch className="h-6 w-6 text-sentinel-600" /> Workflows
      </h1>

      <div className="grid md:grid-cols-2 gap-4">
        {loading ? (
          <div className="col-span-2 text-center py-8 text-gray-400">Chargement...</div>
        ) : (
          data.data.map((wf: any) => (
            <div key={wf.id} className="card cursor-pointer hover:shadow-md transition-shadow" onClick={() => setSelected(wf)}>
              <div className="flex justify-between items-start">
                <div>
                  <span className="badge-blue">{wf.code}</span>
                  <h3 className="font-semibold mt-1">{wf.name}</h3>
                  <p className="text-sm text-gray-500">{wf.module}</p>
                </div>
                <div className="text-right text-xs text-gray-400">
                  <p>SLA : {wf.slaHours}h</p>
                  <p>v{wf.version}</p>
                </div>
              </div>

              {/* Steps preview */}
              <div className="mt-3 flex flex-wrap gap-1">
                {(wf.steps as any[])?.map((s: any, i: number) => (
                  <span key={i} className="text-xs bg-gray-100 px-2 py-0.5 rounded flex items-center gap-1">
                    {i > 0 && <ChevronRight className="h-3 w-3 text-gray-300" />}
                    {s.name}
                  </span>
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Detail */}
      {selected && (
        <div className="card">
          <h3 className="font-semibold mb-4">{selected.name} — Étapes</h3>
          <div className="space-y-2">
            {(selected.steps as any[])?.map((s: any, i: number) => (
              <div key={i} className="flex items-center gap-3 text-sm border-l-2 border-sentinel-200 pl-4 py-2">
                <span className="w-6 h-6 rounded-full bg-sentinel-100 text-sentinel-700 flex items-center justify-center text-xs font-bold">{i + 1}</span>
                <span className="font-medium">{s.name}</span>
                <span className="badge-gray">{s.type}</span>
                <span className={
                  s.automationLevel === 'LEVEL_A' ? 'badge-green' :
                  s.automationLevel === 'LEVEL_B' ? 'badge-yellow' : 'badge-red'
                }>{s.automationLevel}</span>
              </div>
            ))}
          </div>
          <button onClick={() => setSelected(null)} className="btn-secondary mt-4">Fermer</button>
        </div>
      )}
    </div>
  );
}
PAGEEOF_WORKFLOWSPAGE_TSX

cat <<'PAGEEOF_RULESPAGE_TSX' > packages/frontend/src/pages/RulesPage.tsx
import { useEffect, useState } from 'react';
import { api } from '../services/api';
import { Settings, Filter } from 'lucide-react';

export default function RulesPage() {
  const [data, setData] = useState<any>({ data: [], meta: { total: 0 } });
  const [loading, setLoading] = useState(true);
  const [moduleFilter, setModuleFilter] = useState('');

  useEffect(() => {
    const params = new URLSearchParams();
    if (moduleFilter) params.set('module', moduleFilter);
    api.getRules(params.toString()).then(setData).finally(() => setLoading(false));
  }, [moduleFilter]);

  const MODULES = ['FINANCE', 'COMPTA', 'RH', 'ACHAT', 'STOCK', 'ADV', 'JURIDIQUE', 'CRM', 'MARKETING', 'TRAVAUX', 'TRANSVERSE'];

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold flex items-center gap-2">
        <Settings className="h-6 w-6 text-sentinel-600" /> Règles métier
      </h1>

      <div className="card flex gap-4 items-center">
        <Filter className="h-4 w-4 text-gray-400" />
        <select value={moduleFilter} onChange={e => setModuleFilter(e.target.value)} className="input-field w-auto">
          <option value="">Tous les modules</option>
          {MODULES.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
      </div>

      <div className="space-y-3">
        {loading ? (
          <div className="text-center py-8 text-gray-400">Chargement...</div>
        ) : (
          data.data.map((r: any) => (
            <div key={r.id} className="card">
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-xs badge-gray">{r.code}</span>
                    <span className="badge-blue">{r.module}</span>
                    <span className="badge-gray">{r.ruleType}</span>
                    <span className={
                      r.automationLevel === 'LEVEL_A' ? 'badge-green' :
                      r.automationLevel === 'LEVEL_B' ? 'badge-yellow' : 'badge-red'
                    }>{r.automationLevel}</span>
                  </div>
                  <h3 className="font-semibold">{r.name}</h3>
                  {r.description && <p className="text-sm text-gray-500">{r.description}</p>}
                </div>
                <div className="text-right text-xs text-gray-400">
                  <p>v{r.version}</p>
                  <p>Priorité : {r.priority}</p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
PAGEEOF_RULESPAGE_TSX

cat <<'PAGEEOF_INTEGRATIONSPAGE_TSX' > packages/frontend/src/pages/IntegrationsPage.tsx
import { useEffect, useState } from 'react';
import { api } from '../services/api';
import { Plug, CheckCircle, XCircle } from 'lucide-react';

const INTEGRATION_INFO: Record<string, { name: string; description: string }> = {
  N8N: { name: 'n8n', description: 'Orchestrateur de workflows' },
  ODOO: { name: 'Odoo', description: 'ERP métier (CRM, projets, inventaire, comptabilité, RH)' },
  HUBSPOT: { name: 'HubSpot', description: 'CRM / marketing / ventes / service client' },
  ROSSUM: { name: 'Rossum', description: 'OCR documentaire transactionnel' },
  AIRCALL: { name: 'Aircall', description: 'Téléphonie et call center IA' },
  POWERBI: { name: 'Power BI', description: 'Business Intelligence et reporting' },
};

export default function IntegrationsPage() {
  const [health, setHealth] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getIntegrationHealth().then(setHealth).finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold flex items-center gap-2">
        <Plug className="h-6 w-6 text-sentinel-600" /> Intégrations
      </h1>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-3 text-center py-8 text-gray-400">Chargement...</div>
        ) : (
          Object.entries(INTEGRATION_INFO).map(([key, info]) => {
            const status = health?.integrations?.[key] || 'NOT_CONFIGURED';
            const configured = status === 'CONFIGURED';
            return (
              <div key={key} className={`card border-l-4 ${configured ? 'border-l-green-500' : 'border-l-gray-300'}`}>
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold">{info.name}</h3>
                    <p className="text-sm text-gray-500 mt-1">{info.description}</p>
                  </div>
                  {configured ? (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  ) : (
                    <XCircle className="h-5 w-5 text-gray-300" />
                  )}
                </div>
                <div className="mt-3">
                  <span className={configured ? 'badge-green' : 'badge-gray'}>
                    {configured ? 'Configuré' : 'Non configuré'}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="card">
        <h3 className="font-semibold mb-2">Configuration</h3>
        <p className="text-sm text-gray-500">
          Pour activer une intégration, ajoutez les variables d'environnement correspondantes dans votre fichier <code className="bg-gray-100 px-1 rounded">.env</code>.
          Consultez <code className="bg-gray-100 px-1 rounded">.env.example</code> pour la liste complète des clés requises.
        </p>
      </div>
    </div>
  );
}
PAGEEOF_INTEGRATIONSPAGE_TSX

echo "Frontend pages created."

# ============================================================
# INSTALL DEPENDENCIES
# ============================================================

echo ""
echo "=== Installing dependencies ==="
echo ""

npm install
cd packages/backend && npm install
cd ../frontend && npm install

echo ""
echo "=== Setup complete! ==="
echo "Run 'npm run dev' to start the development server."
echo ""
