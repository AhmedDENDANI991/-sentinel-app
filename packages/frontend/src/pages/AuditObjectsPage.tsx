import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../services/api';
import { Shield, ChevronRight, Filter } from 'lucide-react';

const STATES = [
  'RECEIVED', 'FINGERPRINTED', 'CLASSIFIED_PROVISIONAL', 'EXTRACTABLE', 'NOT_EXTRACTABLE',
  'STRUCTURED', 'MATCHED', 'CONTROL_TECHNICAL', 'CONTROL_BUSINESS', 'CONTROL_CROSS',
  'VALIDATED_PROOF', 'VALIDATED_RESERVE', 'PENDING_HUMAN', 'REJECTED_MOTIVATED', 'EXCLUDED_MOTIVATED', 'ARCHIVED',
];

const CRITICALITIES = ['LOW', 'NORMAL', 'HIGH', 'CRITICAL'];

export default function AuditObjectsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [data, setData] = useState<any>({ data: [], meta: { total: 0, page: 1, totalPages: 0 } });
  const [loading, setLoading] = useState(true);
  const [stateFilter, setStateFilter] = useState(searchParams.get('state') || '');
  const [critFilter, setCritFilter] = useState('');

  const fetchData = (page = 1) => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: '20' });
    if (stateFilter) params.set('state', stateFilter);
    if (critFilter) params.set('criticality', critFilter);
    api.getAuditObjects(params.toString()).then(setData).finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, [stateFilter, critFilter]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Shield className="h-6 w-6 text-sentinel-600" /> Objets audités
        </h1>
        <span className="text-sm text-gray-500">{data.meta.total} objets</span>
      </div>

      {/* Filters */}
      <div className="card flex flex-wrap gap-4 items-center">
        <Filter className="h-4 w-4 text-gray-400" />
        <select value={stateFilter} onChange={e => setStateFilter(e.target.value)} className="input-field w-auto">
          <option value="">Tous les états</option>
          {STATES.map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
        </select>
        <select value={critFilter} onChange={e => setCritFilter(e.target.value)} className="input-field w-auto">
          <option value="">Toutes criticités</option>
          {CRITICALITIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="card overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Type</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">État</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Criticité</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Société</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Projet</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Preuves</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">Chargement...</td></tr>
            ) : data.data.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">Aucun objet trouvé</td></tr>
            ) : (
              data.data.map((obj: any) => (
                <tr key={obj.id} className="border-b hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{obj.objectType}</td>
                  <td className="px-4 py-3"><StateBadge state={obj.state} /></td>
                  <td className="px-4 py-3"><CritBadge crit={obj.criticality} /></td>
                  <td className="px-4 py-3 text-gray-600">{obj.company?.code || '-'}</td>
                  <td className="px-4 py-3 text-gray-600">{obj.project?.code || '-'}</td>
                  <td className="px-4 py-3">{obj._count?.proofRecords || 0}</td>
                  <td className="px-4 py-3">
                    <Link to={`/audit-objects/${obj.id}`} className="text-sentinel-600 hover:text-sentinel-800">
                      <ChevronRight className="h-4 w-4" />
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {data.meta.totalPages > 1 && (
        <div className="flex justify-center gap-2">
          {Array.from({ length: Math.min(5, data.meta.totalPages) }, (_, i) => i + 1).map(p => (
            <button key={p} onClick={() => fetchData(p)}
              className={`px-3 py-1 rounded ${p === data.meta.page ? 'bg-sentinel-600 text-white' : 'bg-white border'}`}>
              {p}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function StateBadge({ state }: { state: string }) {
  let cls = 'badge-gray';
  if (state.includes('VALIDATED_PROOF')) cls = 'badge-green';
  else if (state.includes('VALIDATED_RESERVE')) cls = 'badge-yellow';
  else if (state.includes('PENDING')) cls = 'badge-blue';
  else if (state.includes('REJECTED') || state.includes('EXCLUDED')) cls = 'badge-red';
  return <span className={cls}>{state.replace(/_/g, ' ')}</span>;
}

function CritBadge({ crit }: { crit: string }) {
  const cls = crit === 'CRITICAL' ? 'badge-red' : crit === 'HIGH' ? 'badge-yellow' : 'badge-gray';
  return <span className={cls}>{crit}</span>;
}
