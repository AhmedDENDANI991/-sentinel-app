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
