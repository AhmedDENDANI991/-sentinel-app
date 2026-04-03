import { useEffect, useState } from 'react';
import { api } from '../services/api';
import { HelpCircle, Send, AlertTriangle } from 'lucide-react';

export default function QuestionnairesPage() {
  const [data, setData] = useState<any>({ data: [], meta: { total: 0 } });
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [answering, setAnswering] = useState<string | null>(null);
  const [response, setResponse] = useState('');

  const fetchData = () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (statusFilter) params.set('status', statusFilter);
    api.getQuestionnaires(params.toString()).then(setData).finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, [statusFilter]);

  const handleAnswer = async (id: string) => {
    if (!response.trim()) return;
    try {
      await api.answerQuestionnaire(id, { response, responseType: 'FREE_TEXT' });
      setAnswering(null);
      setResponse('');
      fetchData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <HelpCircle className="h-6 w-6 text-sentinel-600" /> Questionnaires intelligents
        </h1>
        <span className="text-sm text-gray-500">{data.meta.total} questionnaires</span>
      </div>

      <div className="card flex gap-4 items-center">
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="input-field w-auto">
          <option value="">Tous les statuts</option>
          <option value="PENDING">En attente</option>
          <option value="ANSWERED">Répondus</option>
          <option value="ESCALATED">Escaladés</option>
          <option value="EXPIRED">Expirés</option>
        </select>
      </div>

      <div className="space-y-4">
        {loading ? (
          <div className="text-center py-8 text-gray-400">Chargement...</div>
        ) : data.data.length === 0 ? (
          <div className="card text-center py-8 text-gray-400">Aucun questionnaire</div>
        ) : (
          data.data.map((q: any) => (
            <div key={q.id} className="card">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={q.status === 'PENDING' ? 'badge-yellow' : q.status === 'ANSWERED' ? 'badge-green' : q.status === 'ESCALATED' ? 'badge-red' : 'badge-gray'}>
                      {q.status}
                    </span>
                    <span className="badge-blue">{q.auditObject?.objectType}</span>
                    <span className="badge-gray">{q.auditObject?.criticality}</span>
                  </div>
                  <h3 className="font-semibold">{q.context}</h3>
                  <p className="text-sm text-gray-500 mt-1">
                    <AlertTriangle className="h-3 w-3 inline text-yellow-500" /> Information manquante : {q.missingInfo}
                  </p>
                </div>
                <div className="text-right text-xs text-gray-400">
                  <p>Assigné à : {q.assignedTo?.firstName} {q.assignedTo?.lastName}</p>
                  <p>Relances : {q.reminderCount}</p>
                </div>
              </div>

              {/* Suggested answers */}
              {q.suggestedAnswers?.length > 0 && (
                <div className="mb-3">
                  <p className="text-xs text-gray-500 mb-1">Réponses suggérées :</p>
                  <div className="flex flex-wrap gap-2">
                    {(q.suggestedAnswers as string[]).map((s: string, i: number) => (
                      <button
                        key={i}
                        onClick={() => { setAnswering(q.id); setResponse(s); }}
                        className="text-xs bg-sentinel-50 text-sentinel-700 px-3 py-1 rounded-full hover:bg-sentinel-100"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Response */}
              {q.response && (
                <div className="bg-green-50 p-3 rounded-lg text-sm">
                  <span className="font-medium text-green-700">Réponse :</span> {q.response}
                </div>
              )}

              {/* Answer form */}
              {q.status === 'PENDING' && (
                <div className="mt-3">
                  {answering === q.id ? (
                    <div className="flex gap-2">
                      <input
                        value={response}
                        onChange={e => setResponse(e.target.value)}
                        className="input-field flex-1"
                        placeholder="Votre réponse..."
                      />
                      <button onClick={() => handleAnswer(q.id)} className="btn-primary flex items-center gap-1">
                        <Send className="h-4 w-4" /> Envoyer
                      </button>
                      <button onClick={() => setAnswering(null)} className="btn-secondary">Annuler</button>
                    </div>
                  ) : (
                    <button onClick={() => setAnswering(q.id)} className="btn-secondary text-sm">
                      Répondre
                    </button>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
