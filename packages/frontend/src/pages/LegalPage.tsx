import { useEffect, useState } from 'react';
import { api } from '../services/api';
import { Scale, AlertTriangle } from 'lucide-react';

export default function LegalPage() {
  const [deadlines, setDeadlines] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getLegalDeadlines().then(setDeadlines).finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold flex items-center gap-2">
        <Scale className="h-6 w-6 text-sentinel-600" /> Juridique / Contentieux
      </h1>

      <div className="card">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-yellow-500" /> Échéances à venir (30 jours)
        </h3>
        {loading ? (
          <p className="text-gray-400">Chargement...</p>
        ) : deadlines.length === 0 ? (
          <p className="text-gray-400">Aucune échéance imminente</p>
        ) : (
          <div className="space-y-3">
            {deadlines.map((c: any) => (
              <div key={c.id} className="border rounded-lg p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="badge-blue">{c.reference}</span>
                    <h4 className="font-medium mt-1">{c.subject}</h4>
                    <p className="text-sm text-gray-500">{c.factStatus || 'Non qualifié'}</p>
                  </div>
                  <div className="text-right">
                    <span className={daysUntil(c.nextDeadline) <= 7 ? 'badge-red' : 'badge-yellow'}>
                      {c.nextDeadline ? new Date(c.nextDeadline).toLocaleDateString('fr-FR') : '-'}
                    </span>
                    {c.amountAtStake && (
                      <p className="text-sm font-mono mt-1">{Number(c.amountAtStake).toLocaleString('fr-FR')} DZD</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function daysUntil(date: string): number {
  if (!date) return 999;
  return Math.ceil((new Date(date).getTime() - Date.now()) / 86400000);
}
