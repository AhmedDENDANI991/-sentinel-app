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
