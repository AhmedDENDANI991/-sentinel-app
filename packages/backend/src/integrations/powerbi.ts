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
