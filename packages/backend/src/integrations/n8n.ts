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
