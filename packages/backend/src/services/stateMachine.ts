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
