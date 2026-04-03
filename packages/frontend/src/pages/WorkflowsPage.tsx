import { useEffect, useState } from 'react';
import { api } from '../services/api';
import { GitBranch, ChevronRight } from 'lucide-react';

export default function WorkflowsPage() {
  const [data, setData] = useState<any>({ data: [], meta: { total: 0 } });
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<any>(null);

  useEffect(() => {
    api.getWorkflows().then(setData).finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold flex items-center gap-2">
        <GitBranch className="h-6 w-6 text-sentinel-600" /> Workflows
      </h1>

      <div className="grid md:grid-cols-2 gap-4">
        {loading ? (
          <div className="col-span-2 text-center py-8 text-gray-400">Chargement...</div>
        ) : (
          data.data.map((wf: any) => (
            <div key={wf.id} className="card cursor-pointer hover:shadow-md transition-shadow" onClick={() => setSelected(wf)}>
              <div className="flex justify-between items-start">
                <div>
                  <span className="badge-blue">{wf.code}</span>
                  <h3 className="font-semibold mt-1">{wf.name}</h3>
                  <p className="text-sm text-gray-500">{wf.module}</p>
                </div>
                <div className="text-right text-xs text-gray-400">
                  <p>SLA : {wf.slaHours}h</p>
                  <p>v{wf.version}</p>
                </div>
              </div>

              {/* Steps preview */}
              <div className="mt-3 flex flex-wrap gap-1">
                {(wf.steps as any[])?.map((s: any, i: number) => (
                  <span key={i} className="text-xs bg-gray-100 px-2 py-0.5 rounded flex items-center gap-1">
                    {i > 0 && <ChevronRight className="h-3 w-3 text-gray-300" />}
                    {s.name}
                  </span>
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Detail */}
      {selected && (
        <div className="card">
          <h3 className="font-semibold mb-4">{selected.name} — Étapes</h3>
          <div className="space-y-2">
            {(selected.steps as any[])?.map((s: any, i: number) => (
              <div key={i} className="flex items-center gap-3 text-sm border-l-2 border-sentinel-200 pl-4 py-2">
                <span className="w-6 h-6 rounded-full bg-sentinel-100 text-sentinel-700 flex items-center justify-center text-xs font-bold">{i + 1}</span>
                <span className="font-medium">{s.name}</span>
                <span className="badge-gray">{s.type}</span>
                <span className={
                  s.automationLevel === 'LEVEL_A' ? 'badge-green' :
                  s.automationLevel === 'LEVEL_B' ? 'badge-yellow' : 'badge-red'
                }>{s.automationLevel}</span>
              </div>
            ))}
          </div>
          <button onClick={() => setSelected(null)} className="btn-secondary mt-4">Fermer</button>
        </div>
      )}
    </div>
  );
}
