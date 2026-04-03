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
