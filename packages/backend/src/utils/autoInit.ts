import { execSync } from 'child_process';
import { existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PRISMA_DIR = path.join(__dirname, '../../prisma');
const DB_PATH = path.join(PRISMA_DIR, 'sentinel.db');

export async function autoInit() {
  console.log('[auto-init] Checking database...');

  // Set DATABASE_URL for SQLite if not set
  if (!process.env.DATABASE_URL || process.env.DATABASE_URL.includes('postgresql')) {
    process.env.DATABASE_URL = `file:${DB_PATH}`;
  }

  const dbExists = existsSync(DB_PATH);

  // Always run db push to ensure schema is up to date (idempotent for SQLite)
  try {
    console.log('[auto-init] Syncing database schema...');
    execSync('npx prisma db push --skip-generate', {
      cwd: path.join(__dirname, '../..'),
      stdio: 'pipe',
      env: { ...process.env, DATABASE_URL: `file:${DB_PATH}` },
    });
    console.log('[auto-init] Schema synced.');
  } catch (err: any) {
    console.error('[auto-init] Schema sync failed:', err.stderr?.toString() || err.message);
    throw err;
  }

  // Seed if database was just created
  if (!dbExists) {
    console.log('[auto-init] New database detected, seeding...');
    await seedDatabase();
  } else {
    // Check if users exist, seed if empty
    const prisma = new PrismaClient({ datasources: { db: { url: `file:${DB_PATH}` } } });
    try {
      const userCount = await prisma.user.count();
      if (userCount === 0) {
        console.log('[auto-init] Empty database detected, seeding...');
        await prisma.$disconnect();
        await seedDatabase();
      } else {
        console.log(`[auto-init] Database ready (${userCount} users found).`);
        await prisma.$disconnect();
      }
    } catch {
      await prisma.$disconnect();
      console.log('[auto-init] Seeding fresh database...');
      await seedDatabase();
    }
  }
}

async function seedDatabase() {
  const prisma = new PrismaClient({ datasources: { db: { url: `file:${DB_PATH}` } } });

  try {
    // Users
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
      },
    });

    const dafHash = await bcrypt.hash('sentinel-daf-2024', 12);
    await prisma.user.upsert({
      where: { email: 'daf@sentinel.dz' },
      update: {},
      create: {
        email: 'daf@sentinel.dz',
        passwordHash: dafHash,
        firstName: 'Directeur',
        lastName: 'Financier',
        role: 'DAF',
      },
    });

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
      },
    });

    // Companies
    const company1 = await prisma.company.upsert({
      where: { code: 'SCI-01' },
      update: {},
      create: { code: 'SCI-01', name: 'SCI Immobiliere Alpha', legalForm: 'SCI', address: 'Alger, Algerie' },
    });
    const company2 = await prisma.company.upsert({
      where: { code: 'SARL-01' },
      update: {},
      create: { code: 'SARL-01', name: 'SARL Construction Beta', legalForm: 'SARL', address: 'Oran, Algerie' },
    });
    const company3 = await prisma.company.upsert({
      where: { code: 'EURL-01' },
      update: {},
      create: { code: 'EURL-01', name: 'EURL Services Gamma', legalForm: 'EURL', address: 'Constantine, Algerie' },
    });

    // Projects
    const project1 = await prisma.project.upsert({
      where: { code: 'PROJ-ALPHA-01' },
      update: {},
      create: { companyId: company1.id, code: 'PROJ-ALPHA-01', name: 'Residence Alpha - Lot 1', type: 'CONSTRUCTION', budget: 500000000 },
    });
    await prisma.project.upsert({
      where: { code: 'PROJ-BETA-01' },
      update: {},
      create: { companyId: company2.id, code: 'PROJ-BETA-01', name: 'Centre Commercial Beta', type: 'PROMOTION', budget: 1200000000 },
    });

    // Cost centers
    await prisma.costCenter.upsert({
      where: { code: 'CC-ALPHA-GROS-OEUVRE' },
      update: {},
      create: { companyId: company1.id, projectId: project1.id, code: 'CC-ALPHA-GROS-OEUVRE', name: 'Gros Oeuvre Alpha' },
    });

    // Accounts
    const accounts = [
      { code: '401000', name: 'Fournisseurs', type: 'LIABILITY' },
      { code: '411000', name: 'Clients', type: 'ASSET' },
      { code: '512000', name: 'Banque', type: 'ASSET' },
      { code: '530000', name: 'Caisse', type: 'ASSET' },
      { code: '601000', name: 'Achats materiaux', type: 'EXPENSE' },
      { code: '613000', name: 'Sous-traitance', type: 'EXPENSE' },
      { code: '641000', name: 'Remunerations', type: 'EXPENSE' },
      { code: '701000', name: 'Ventes', type: 'REVENUE' },
    ];
    for (const acc of accounts) {
      for (const comp of [company1, company2]) {
        await prisma.account.upsert({
          where: { companyId_code: { companyId: comp.id, code: acc.code } },
          update: {},
          create: { companyId: comp.id, ...acc },
        });
      }
    }

    // Business rules
    await prisma.businessRule.upsert({
      where: { code: 'RULE-COMPTA-001' },
      update: {},
      create: {
        code: 'RULE-COMPTA-001', module: 'COMPTA', name: 'Interdiction validation sans preuve',
        ruleType: 'VALIDATION', condition: JSON.stringify({ field: 'proofStatus', operator: 'eq', value: 'MISSING' }),
        action: JSON.stringify({ block: true, message: 'Ecriture non validable : preuve manquante' }),
        automationLevel: 'LEVEL_C', priority: 1,
      },
    });
    await prisma.businessRule.upsert({
      where: { code: 'RULE-ACHAT-001' },
      update: {},
      create: {
        code: 'RULE-ACHAT-001', module: 'ACHAT', name: 'Seuil approbation DAF',
        ruleType: 'THRESHOLD', condition: JSON.stringify({ field: 'totalAmount', operator: 'gt', value: 5000000 }),
        action: JSON.stringify({ requireApproval: true, approver: 'DAF' }),
        automationLevel: 'LEVEL_C', priority: 10,
      },
    });
    await prisma.businessRule.upsert({
      where: { code: 'RULE-DOC-001' },
      update: {},
      create: {
        code: 'RULE-DOC-001', module: 'TRANSVERSE', name: 'Classification automatique faible risque',
        ruleType: 'AUTOMATION', condition: JSON.stringify({ confidence: { operator: 'gte', value: 0.95 } }),
        action: JSON.stringify({ autoClassify: true, noHumanNeeded: true }),
        automationLevel: 'LEVEL_A', priority: 50,
      },
    });

    // Workflow
    await prisma.workflow.upsert({
      where: { code: 'WF-INGESTION-DOC' },
      update: {},
      create: {
        code: 'WF-INGESTION-DOC', module: 'DOCUMENT', name: 'Workflow ingestion documentaire',
        slaHours: 48, escalateAfterHours: 72,
        steps: JSON.stringify([
          { name: 'Reception', type: 'TRIGGER', automationLevel: 'LEVEL_A' },
          { name: 'Empreinte & deduplication', type: 'AUTO_PROCESS', automationLevel: 'LEVEL_A' },
          { name: 'Classification IA', type: 'AUTO_PROCESS', automationLevel: 'LEVEL_B' },
          { name: 'Extraction donnees', type: 'AUTO_PROCESS', automationLevel: 'LEVEL_B' },
          { name: 'Controle coherence', type: 'LOGIC_CHECK', automationLevel: 'LEVEL_B' },
          { name: 'Validation metier', type: 'BUSINESS_CHECK', automationLevel: 'LEVEL_C' },
          { name: 'Archivage', type: 'AUTO_PROCESS', automationLevel: 'LEVEL_A' },
        ]),
      },
    });

    // Employee
    await prisma.employee.upsert({
      where: { code: 'EMP-001' },
      update: {},
      create: {
        companyId: company1.id, code: 'EMP-001', firstName: 'Mohamed', lastName: 'Benali',
        position: 'Chef de chantier', department: 'Travaux', contractType: 'CDI', baseSalary: 80000,
      },
    });

    // Articles
    await prisma.article.upsert({
      where: { code: 'ART-CIM-001' },
      update: {},
      create: { code: 'ART-CIM-001', name: 'Ciment CPJ 42.5', category: 'Materiaux', unit: 'KG', minStock: 5000 },
    });
    await prisma.article.upsert({
      where: { code: 'ART-FER-001' },
      update: {},
      create: { code: 'ART-FER-001', name: 'Fer a beton T12', category: 'Materiaux', unit: 'KG', minStock: 2000 },
    });

    // Sample audit objects with state transitions
    const ao1 = await prisma.auditObject.create({
      data: {
        companyId: company1.id, projectId: project1.id,
        objectType: 'DOCUMENT', objectId: 'sample-facture-001',
        state: 'VALIDATED_PROOF', criticality: 'HIGH',
        classFamily: 'FACTURE', reliabilityScore: 0.95,
      },
    });
    await prisma.stateTransition.createMany({
      data: [
        { auditObjectId: ao1.id, fromState: 'RECEIVED', toState: 'FINGERPRINTED', actorType: 'SYSTEM' },
        { auditObjectId: ao1.id, fromState: 'FINGERPRINTED', toState: 'CLASSIFIED_PROVISIONAL', actorType: 'SYSTEM' },
        { auditObjectId: ao1.id, fromState: 'CLASSIFIED_PROVISIONAL', toState: 'EXTRACTABLE', actorType: 'AI_PROPOSAL' },
        { auditObjectId: ao1.id, fromState: 'EXTRACTABLE', toState: 'STRUCTURED', actorType: 'SYSTEM' },
        { auditObjectId: ao1.id, fromState: 'STRUCTURED', toState: 'MATCHED', actorType: 'RULE_ENGINE' },
        { auditObjectId: ao1.id, fromState: 'MATCHED', toState: 'CONTROL_TECHNICAL', actorType: 'SYSTEM' },
        { auditObjectId: ao1.id, fromState: 'CONTROL_TECHNICAL', toState: 'CONTROL_BUSINESS', actorType: 'HUMAN', actorId: admin.id },
        { auditObjectId: ao1.id, fromState: 'CONTROL_BUSINESS', toState: 'CONTROL_CROSS', actorType: 'HUMAN', actorId: admin.id },
        { auditObjectId: ao1.id, fromState: 'CONTROL_CROSS', toState: 'VALIDATED_PROOF', actorType: 'HUMAN', actorId: admin.id, reason: 'Preuve complete, montants concordants' },
      ],
    });

    const ao2 = await prisma.auditObject.create({
      data: {
        companyId: company1.id,
        objectType: 'JOURNAL_ENTRY', objectId: 'sample-entry-001',
        state: 'PENDING_HUMAN', criticality: 'CRITICAL',
        classFamily: 'ECRITURE',
      },
    });

    const ao3 = await prisma.auditObject.create({
      data: {
        companyId: company2.id,
        objectType: 'PURCHASE', objectId: 'sample-po-001',
        state: 'VALIDATED_RESERVE', criticality: 'NORMAL',
      },
    });

    // Proof records
    await prisma.proofRecord.create({
      data: {
        auditObjectId: ao1.id, fieldName: 'amount', extractionEngine: 'OCR',
        extractionScore: 0.97, decision: 'VALIDATED', validationRule: 'RULE-COMPTA-001',
        isImmutable: true, checksum: 'sample-checksum-001',
      },
    });
    await prisma.proofRecord.create({
      data: {
        auditObjectId: ao2.id, fieldName: 'thirdParty', extractionEngine: 'AI',
        extractionScore: 0.72, decision: 'PENDING', decisionReason: 'Score trop bas, verification humaine requise',
      },
    });

    // Questionnaire
    await prisma.questionnaire.create({
      data: {
        auditObjectId: ao2.id, assignedToId: admin.id,
        context: 'Ecriture comptable avec tiers non identifie',
        missingInfo: 'Le tiers fournisseur ne correspond a aucun referentiel connu',
        suggestedAnswers: JSON.stringify(['Fournisseur ABC (similitude 85%)', 'Fournisseur XYZ (similitude 72%)', 'Nouveau tiers a creer', 'Erreur de saisie']),
        expectedDocs: JSON.stringify(['Facture originale', 'Bon de commande']),
        status: 'PENDING',
      },
    });

    console.log('[auto-init] Seed completed: 3 users, 3 companies, 2 projects, 16 accounts, 3 rules, 1 workflow, 1 employee, 2 articles, 3 audit objects, 2 proofs, 1 questionnaire.');
  } finally {
    await prisma.$disconnect();
  }
}
