import { useEffect, useState } from 'react';
import { api } from '../services/api';
import { BookOpen, AlertTriangle } from 'lucide-react';

export default function JournalPage() {
  const [data, setData] = useState<any>({ data: [], meta: { total: 0 } });
  const [anomalies, setAnomalies] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    const params = new URLSearchParams();
    if (statusFilter) params.set('status', statusFilter);
    Promise.all([
      api.getJournalEntries(params.toString()),
      api.getJournalAnomalies(),
    ]).then(([d, a]) => {
      setData(d);
      setAnomalies(a);
    }).finally(() => setLoading(false));
  }, [statusFilter]);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold flex items-center gap-2">
        <BookOpen className="h-6 w-6 text-sentinel-600" /> Comptabilité
      </h1>

      {/* Anomaly banner */}
      {anomalies && (anomalies.missingProof > 0 || anomalies.inconsistent > 0) && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 text-yellow-600" />
          <div className="text-sm">
            <strong className="text-yellow-800">Anomalies détectées :</strong>
            <span className="text-yellow-700 ml-2">
              {anomalies.missingProof} sans preuve | {anomalies.inconsistent} incohérentes | {anomalies.potentialDuplicates} doublons potentiels
            </span>
          </div>
        </div>
      )}

      <div className="card flex gap-4 items-center">
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="input-field w-auto">
          <option value="">Tous les statuts</option>
          <option value="DRAFT">Brouillon</option>
          <option value="PROPOSED">Proposé</option>
          <option value="VALIDATED">Validé</option>
          <option value="REJECTED">Rejeté</option>
          <option value="RESERVED">Réservé</option>
        </select>
      </div>

      <div className="card overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Date</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Journal</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Libellé</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Débit</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Crédit</th>
              <th className="text-right px-4 py-3 font-medium text-gray-600">Montant</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Preuve</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Statut</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-400">Chargement...</td></tr>
            ) : data.data.length === 0 ? (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-400">Aucune écriture</td></tr>
            ) : (
              data.data.map((e: any) => (
                <tr key={e.id} className="border-b hover:bg-gray-50">
                  <td className="px-4 py-3">{new Date(e.entryDate).toLocaleDateString('fr-FR')}</td>
                  <td className="px-4 py-3 font-mono">{e.journal}</td>
                  <td className="px-4 py-3">{e.label}</td>
                  <td className="px-4 py-3 text-xs">{e.debitAccount?.code} {e.debitAccount?.name}</td>
                  <td className="px-4 py-3 text-xs">{e.creditAccount?.code} {e.creditAccount?.name}</td>
                  <td className="px-4 py-3 text-right font-mono">{Number(e.amount).toLocaleString('fr-FR')}</td>
                  <td className="px-4 py-3">
                    <span className={e.proofStatus === 'PRESENT' ? 'badge-green' : e.proofStatus === 'MISSING' ? 'badge-red' : 'badge-yellow'}>
                      {e.proofStatus}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={e.status === 'VALIDATED' ? 'badge-green' : e.status === 'REJECTED' ? 'badge-red' : 'badge-gray'}>
                      {e.status}
                    </span>
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
