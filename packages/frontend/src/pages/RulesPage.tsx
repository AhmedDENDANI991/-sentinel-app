import { useEffect, useState } from 'react';
import { api } from '../services/api';
import { Settings, Filter } from 'lucide-react';

export default function RulesPage() {
  const [data, setData] = useState<any>({ data: [], meta: { total: 0 } });
  const [loading, setLoading] = useState(true);
  const [moduleFilter, setModuleFilter] = useState('');

  useEffect(() => {
    const params = new URLSearchParams();
    if (moduleFilter) params.set('module', moduleFilter);
    api.getRules(params.toString()).then(setData).finally(() => setLoading(false));
  }, [moduleFilter]);

  const MODULES = ['FINANCE', 'COMPTA', 'RH', 'ACHAT', 'STOCK', 'ADV', 'JURIDIQUE', 'CRM', 'MARKETING', 'TRAVAUX', 'TRANSVERSE'];

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold flex items-center gap-2">
        <Settings className="h-6 w-6 text-sentinel-600" /> Règles métier
      </h1>

      <div className="card flex gap-4 items-center">
        <Filter className="h-4 w-4 text-gray-400" />
        <select value={moduleFilter} onChange={e => setModuleFilter(e.target.value)} className="input-field w-auto">
          <option value="">Tous les modules</option>
          {MODULES.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
      </div>

      <div className="space-y-3">
        {loading ? (
          <div className="text-center py-8 text-gray-400">Chargement...</div>
        ) : (
          data.data.map((r: any) => (
            <div key={r.id} className="card">
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-xs badge-gray">{r.code}</span>
                    <span className="badge-blue">{r.module}</span>
                    <span className="badge-gray">{r.ruleType}</span>
                    <span className={
                      r.automationLevel === 'LEVEL_A' ? 'badge-green' :
                      r.automationLevel === 'LEVEL_B' ? 'badge-yellow' : 'badge-red'
                    }>{r.automationLevel}</span>
                  </div>
                  <h3 className="font-semibold">{r.name}</h3>
                  {r.description && <p className="text-sm text-gray-500">{r.description}</p>}
                </div>
                <div className="text-right text-xs text-gray-400">
                  <p>v{r.version}</p>
                  <p>Priorité : {r.priority}</p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
