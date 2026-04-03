import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../services/api';
import { Shield, ArrowRight, FileCheck, HelpCircle, ArrowLeft } from 'lucide-react';

export default function AuditObjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [obj, setObj] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [transitioning, setTransitioning] = useState(false);
  const [reason, setReason] = useState('');
  const [selectedState, setSelectedState] = useState('');

  useEffect(() => {
    if (id) {
      api.getAuditObject(id).then(setObj).finally(() => setLoading(false));
    }
  }, [id]);

  const handleTransition = async () => {
    if (!id || !selectedState) return;
    setTransitioning(true);
    try {
      const result = await api.transitionState(id, { toState: selectedState, reason, actorType: 'HUMAN' });
      setObj({ ...obj, ...result.auditObject, validTransitions: [] });
      setSelectedState('');
      setReason('');
      // Refresh
      const fresh = await api.getAuditObject(id);
      setObj(fresh);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setTransitioning(false);
    }
  };

  if (loading) return <div className="flex justify-center py-20"><div className="animate-spin h-8 w-8 border-4 border-sentinel-600 border-t-transparent rounded-full" /></div>;
  if (!obj) return <div className="text-center py-20 text-gray-500">Objet non trouvé</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link to="/audit-objects" className="text-gray-400 hover:text-gray-600"><ArrowLeft className="h-5 w-5" /></Link>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Shield className="h-6 w-6 text-sentinel-600" />
          {obj.objectType} — {obj.objectId.substring(0, 8)}
        </h1>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Info */}
        <div className="card space-y-3">
          <h3 className="font-semibold">Informations</h3>
          <InfoRow label="Type" value={obj.objectType} />
          <InfoRow label="État" value={obj.state} badge />
          <InfoRow label="Criticité" value={obj.criticality} />
          <InfoRow label="Société" value={obj.company?.name || '-'} />
          <InfoRow label="Projet" value={obj.project?.name || '-'} />
          <InfoRow label="Score fiabilité" value={obj.reliabilityScore ? `${(obj.reliabilityScore * 100).toFixed(0)}%` : '-'} />
          <InfoRow label="Famille" value={obj.classFamily || '-'} />
        </div>

        {/* Proof summary */}
        <div className="card space-y-3">
          <h3 className="font-semibold flex items-center gap-2"><FileCheck className="h-4 w-4" /> Registre de preuve</h3>
          {obj.proofSummary ? (
            <>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="bg-green-50 p-2 rounded"><span className="font-bold text-green-700">{obj.proofSummary.validated}</span> <span className="text-green-600">validées</span></div>
                <div className="bg-yellow-50 p-2 rounded"><span className="font-bold text-yellow-700">{obj.proofSummary.withReserve}</span> <span className="text-yellow-600">avec réserve</span></div>
                <div className="bg-blue-50 p-2 rounded"><span className="font-bold text-blue-700">{obj.proofSummary.pending}</span> <span className="text-blue-600">en attente</span></div>
                <div className="bg-red-50 p-2 rounded"><span className="font-bold text-red-700">{obj.proofSummary.rejected}</span> <span className="text-red-600">rejetées</span></div>
              </div>
              <div className="text-sm text-gray-500">
                Confiance moyenne : {(obj.proofSummary.averageConfidence * 100).toFixed(0)}%
                <br />Immuables : {obj.proofSummary.immutable}
              </div>
            </>
          ) : <p className="text-sm text-gray-400">Aucune preuve</p>}
        </div>

        {/* Transition */}
        <div className="card space-y-3">
          <h3 className="font-semibold">Transition d'état</h3>
          {obj.validTransitions?.length > 0 ? (
            <>
              <select value={selectedState} onChange={e => setSelectedState(e.target.value)} className="input-field">
                <option value="">Sélectionner un état cible</option>
                {obj.validTransitions.map((s: string) => (
                  <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
                ))}
              </select>
              <textarea
                value={reason}
                onChange={e => setReason(e.target.value)}
                className="input-field"
                placeholder="Motif de la transition..."
                rows={2}
              />
              <button onClick={handleTransition} disabled={!selectedState || transitioning} className="btn-primary w-full">
                {transitioning ? 'Transition...' : 'Appliquer la transition'}
              </button>
            </>
          ) : (
            <p className="text-sm text-gray-400">Aucune transition disponible depuis cet état</p>
          )}
        </div>
      </div>

      {/* Transition history */}
      <div className="card">
        <h3 className="font-semibold mb-4">Historique des transitions</h3>
        <div className="space-y-3">
          {obj.stateTransitions?.map((t: any, i: number) => (
            <div key={t.id} className="flex items-center gap-3 text-sm">
              <span className="w-6 h-6 rounded-full bg-sentinel-100 text-sentinel-700 flex items-center justify-center text-xs font-bold">{i + 1}</span>
              <span className="badge-gray">{t.fromState}</span>
              <ArrowRight className="h-3 w-3 text-gray-400" />
              <span className="badge-blue">{t.toState}</span>
              <span className="text-gray-400">|</span>
              <span className="text-gray-500">{t.actorType}</span>
              {t.reason && <span className="text-gray-400 italic">— {t.reason}</span>}
              <span className="ml-auto text-xs text-gray-400">{new Date(t.createdAt).toLocaleString('fr-FR')}</span>
            </div>
          ))}
          {(!obj.stateTransitions || obj.stateTransitions.length === 0) && (
            <p className="text-sm text-gray-400">Aucune transition enregistrée</p>
          )}
        </div>
      </div>

      {/* Questionnaires */}
      {obj.questionnaires?.length > 0 && (
        <div className="card">
          <h3 className="font-semibold mb-4 flex items-center gap-2"><HelpCircle className="h-4 w-4" /> Questionnaires</h3>
          <div className="space-y-3">
            {obj.questionnaires.map((q: any) => (
              <div key={q.id} className="border rounded-lg p-3">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium text-sm">{q.context}</p>
                    <p className="text-sm text-gray-500 mt-1">Manque : {q.missingInfo}</p>
                  </div>
                  <span className={q.status === 'PENDING' ? 'badge-yellow' : q.status === 'ANSWERED' ? 'badge-green' : 'badge-red'}>
                    {q.status}
                  </span>
                </div>
                {q.response && <p className="mt-2 text-sm bg-green-50 p-2 rounded">Réponse : {q.response}</p>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function InfoRow({ label, value, badge }: { label: string; value: string; badge?: boolean }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-gray-500">{label}</span>
      {badge ? <span className="badge-blue">{value}</span> : <span className="font-medium">{value}</span>}
    </div>
  );
}
