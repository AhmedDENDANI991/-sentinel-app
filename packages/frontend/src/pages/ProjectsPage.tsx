import { useEffect, useState } from 'react';
import { api } from '../services/api';
import { FolderKanban } from 'lucide-react';

export default function ProjectsPage() {
  const [data, setData] = useState<any>({ data: [], meta: { total: 0 } });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getProjects().then(setData).finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold flex items-center gap-2">
        <FolderKanban className="h-6 w-6 text-sentinel-600" /> Projets
      </h1>

      <div className="grid md:grid-cols-2 gap-4">
        {loading ? (
          <div className="col-span-2 text-center py-8 text-gray-400">Chargement...</div>
        ) : data.data.length === 0 ? (
          <div className="col-span-2 card text-center text-gray-400">Aucun projet</div>
        ) : (
          data.data.map((p: any) => (
            <div key={p.id} className="card">
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="badge-blue">{p.code}</span>
                    <span className="badge-gray">{p.type}</span>
                  </div>
                  <h3 className="font-semibold">{p.name}</h3>
                  <p className="text-sm text-gray-500">{p.company?.name}</p>
                </div>
                <span className={p.status === 'ACTIVE' ? 'badge-green' : 'badge-gray'}>{p.status}</span>
              </div>
              {p.budget && (
                <p className="text-sm text-gray-600 mt-2">
                  Budget : {new Intl.NumberFormat('fr-DZ', { style: 'currency', currency: 'DZD' }).format(p.budget)}
                </p>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
