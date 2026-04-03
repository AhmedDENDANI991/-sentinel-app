import { useEffect, useState } from 'react';
import { api } from '../services/api';
import { Plug, CheckCircle, XCircle } from 'lucide-react';

const INTEGRATION_INFO: Record<string, { name: string; description: string }> = {
  N8N: { name: 'n8n', description: 'Orchestrateur de workflows' },
  ODOO: { name: 'Odoo', description: 'ERP métier (CRM, projets, inventaire, comptabilité, RH)' },
  HUBSPOT: { name: 'HubSpot', description: 'CRM / marketing / ventes / service client' },
  ROSSUM: { name: 'Rossum', description: 'OCR documentaire transactionnel' },
  AIRCALL: { name: 'Aircall', description: 'Téléphonie et call center IA' },
  POWERBI: { name: 'Power BI', description: 'Business Intelligence et reporting' },
};

export default function IntegrationsPage() {
  const [health, setHealth] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getIntegrationHealth().then(setHealth).finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold flex items-center gap-2">
        <Plug className="h-6 w-6 text-sentinel-600" /> Intégrations
      </h1>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-3 text-center py-8 text-gray-400">Chargement...</div>
        ) : (
          Object.entries(INTEGRATION_INFO).map(([key, info]) => {
            const status = health?.integrations?.[key] || 'NOT_CONFIGURED';
            const configured = status === 'CONFIGURED';
            return (
              <div key={key} className={`card border-l-4 ${configured ? 'border-l-green-500' : 'border-l-gray-300'}`}>
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold">{info.name}</h3>
                    <p className="text-sm text-gray-500 mt-1">{info.description}</p>
                  </div>
                  {configured ? (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  ) : (
                    <XCircle className="h-5 w-5 text-gray-300" />
                  )}
                </div>
                <div className="mt-3">
                  <span className={configured ? 'badge-green' : 'badge-gray'}>
                    {configured ? 'Configuré' : 'Non configuré'}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="card">
        <h3 className="font-semibold mb-2">Configuration</h3>
        <p className="text-sm text-gray-500">
          Pour activer une intégration, ajoutez les variables d'environnement correspondantes dans votre fichier <code className="bg-gray-100 px-1 rounded">.env</code>.
          Consultez <code className="bg-gray-100 px-1 rounded">.env.example</code> pour la liste complète des clés requises.
        </p>
      </div>
    </div>
  );
}
