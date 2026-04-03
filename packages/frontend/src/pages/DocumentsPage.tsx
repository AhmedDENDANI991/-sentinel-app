import { useEffect, useState } from 'react';
import { api } from '../services/api';
import { FileText, Filter } from 'lucide-react';

const FAMILIES = ['FACTURE', 'BON', 'CONTRAT', 'PV', 'PHOTO', 'SCAN', 'RELEVE', 'PAIE', 'AUTRE'];

export default function DocumentsPage() {
  const [data, setData] = useState<any>({ data: [], meta: { total: 0 } });
  const [loading, setLoading] = useState(true);
  const [familyFilter, setFamilyFilter] = useState('');

  useEffect(() => {
    const params = new URLSearchParams();
    if (familyFilter) params.set('family', familyFilter);
    api.getDocuments(params.toString()).then(setData).finally(() => setLoading(false));
  }, [familyFilter]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <FileText className="h-6 w-6 text-sentinel-600" /> Documents
        </h1>
        <span className="text-sm text-gray-500">{data.meta.total} documents</span>
      </div>

      <div className="card flex gap-4 items-center">
        <Filter className="h-4 w-4 text-gray-400" />
        <select value={familyFilter} onChange={e => setFamilyFilter(e.target.value)} className="input-field w-auto">
          <option value="">Toutes familles</option>
          {FAMILIES.map(f => <option key={f} value={f}>{f}</option>)}
        </select>
      </div>

      <div className="card overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Nom</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Famille</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Société</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Période</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Statut</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Confiance OCR</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">Chargement...</td></tr>
            ) : data.data.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">Aucun document</td></tr>
            ) : (
              data.data.map((d: any) => (
                <tr key={d.id} className="border-b hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="font-medium">{d.originalName}</div>
                    {d.normalizedName && <div className="text-xs text-gray-400">{d.normalizedName}</div>}
                  </td>
                  <td className="px-4 py-3"><span className="badge-blue">{d.family || '-'}</span></td>
                  <td className="px-4 py-3 text-gray-600">{d.company?.name || '-'}</td>
                  <td className="px-4 py-3 text-gray-600">{d.period || '-'}</td>
                  <td className="px-4 py-3">
                    <span className={d.isDuplicate ? 'badge-yellow' : d.status === 'ORPHAN' ? 'badge-red' : 'badge-green'}>
                      {d.isDuplicate ? 'DUPLICATE' : d.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {d.ocrConfidence ? `${(d.ocrConfidence * 100).toFixed(0)}%` : '-'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
