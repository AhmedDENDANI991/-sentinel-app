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
