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
