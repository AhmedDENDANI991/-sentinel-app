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
      suggestedAnswers: JSON.stringify(params.suggestedAnswers ?? []),
      expectedDocs: JSON.stringify(params.expectedDocs ?? []),
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
      uploadedDocIds: JSON.stringify(uploadedDocIds ?? []),
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
