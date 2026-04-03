import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import {
  Building2, FolderKanban, FileText, Users, Shield, HelpCircle,
  AlertTriangle, CheckCircle, Clock, XCircle, BookOpen, Scale, Plug
} from 'lucide-react';

export default function DashboardPage() {
  const [kpis, setKpis] = useState<any>(null);
  const [queues, setQueues] = useState<any>(null);
  const [stateDist, setStateDist] = useState<any[]>([]);
  const [activity, setActivity] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.getKPIs().catch(() => null),
      api.getQueues().catch(() => null),
      api.getStateDistribution().catch(() => []),
      api.getActivity().catch(() => []),
    ]).then(([k, q, s, a]) => {
      setKpis(k);
      setQueues(q);
      setStateDist(s);
      setActivity(a);
      setLoading(false);
    });
  }, []);

  if (loading) return <div className="flex justify-center py-20"><div className="animate-spin h-8 w-8 border-4 border-sentinel-600 border-t-transparent rounded-full" /></div>;

  const overview = kpis?.overview || {};
  const gov = kpis?.governance || {};
  const acc = kpis?.accounting || {};
  const ops = kpis?.operations || {};

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Tableau de bord</h1>

      {/* Overview KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPICard icon={Building2} label="Sociétés" value={overview.companies} color="blue" />
        <KPICard icon={FolderKanban} label="Projets actifs" value={overview.projects} color="green" />
        <KPICard icon={FileText} label="Documents" value={overview.documents} color="purple" />
        <KPICard icon={Users} label="Employés" value={overview.employees} color="amber" />
      </div>

      {/* Governance */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPICard icon={Shield} label="Objets audités" value={gov.totalAuditObjects} color="indigo" />
        <KPICard icon={CheckCircle} label="Validés preuve" value={gov.validatedProof} color="green" />
        <KPICard icon={AlertTriangle} label="Avec réserve" value={gov.validatedReserve} color="yellow" />
        <KPICard icon={Clock} label="En attente humain" value={gov.pendingHuman} color="orange" />
      </div>

      {/* Queues */}
      {queues && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <QueueCard label="A arbitrer" value={queues.toArbitrate} severity="high" link="/audit-objects?state=PENDING_HUMAN" />
          <QueueCard label="Preuves manquantes" value={queues.missingProof} severity="medium" link="/audit-objects" />
          <QueueCard label="Bloqués" value={queues.blocked} severity="high" link="/workflows" />
          <QueueCard label="Relances dépassées" value={queues.overdueReminders} severity="medium" link="/questionnaires?status=PENDING" />
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        {/* State distribution */}
        <div className="card">
          <h3 className="font-semibold mb-4">Distribution des états</h3>
          <div className="space-y-2">
            {stateDist.map((s: any) => (
              <div key={s.state} className="flex items-center justify-between text-sm">
                <span className="text-gray-600">{formatState(s.state)}</span>
                <div className="flex items-center gap-2">
                  <div className="w-24 bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${stateColor(s.state)}`}
                      style={{ width: `${Math.min(100, (s.count / Math.max(1, gov.totalAuditObjects)) * 100)}%` }}
                    />
                  </div>
                  <span className="font-medium w-8 text-right">{s.count}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent activity */}
        <div className="card">
          <h3 className="font-semibold mb-4">Activité récente</h3>
          <div className="space-y-3 max-h-80 overflow-y-auto">
            {activity.slice(0, 15).map((a: any) => (
              <div key={a.id} className="flex items-start gap-3 text-sm">
                <div className={`mt-1 w-2 h-2 rounded-full flex-shrink-0 ${actionColor(a.action)}`} />
                <div>
                  <span className="font-medium">{a.user?.firstName} {a.user?.lastName}</span>
                  <span className="text-gray-500"> {a.action.toLowerCase()} </span>
                  <span className="text-gray-700">{a.entityType}</span>
                  <div className="text-xs text-gray-400">{new Date(a.createdAt).toLocaleString('fr-FR')}</div>
                </div>
              </div>
            ))}
            {activity.length === 0 && <p className="text-gray-400 text-sm">Aucune activité</p>}
          </div>
        </div>
      </div>

      {/* Quick stats row */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <MiniStat label="Écritures" value={acc.journalEntries} icon={BookOpen} />
        <MiniStat label="Sans preuve" value={acc.missingProof} icon={AlertTriangle} alert />
        <MiniStat label="Tâches actives" value={ops.activeTasks} icon={Users} />
        <MiniStat label="Dossiers ouverts" value={ops.openCases} icon={Scale} />
        <MiniStat label="Erreurs intég." value={kpis?.integrations?.errors} icon={Plug} alert={kpis?.integrations?.errors > 0} />
      </div>
    </div>
  );
}

function KPICard({ icon: Icon, label, value, color }: any) {
  const colorClasses: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    purple: 'bg-purple-50 text-purple-600',
    amber: 'bg-amber-50 text-amber-600',
    indigo: 'bg-indigo-50 text-indigo-600',
    yellow: 'bg-yellow-50 text-yellow-600',
    orange: 'bg-orange-50 text-orange-600',
    red: 'bg-red-50 text-red-600',
  };

  return (
    <div className="card flex items-center gap-4">
      <div className={`p-3 rounded-lg ${colorClasses[color] || colorClasses.blue}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="text-2xl font-bold">{value ?? 0}</p>
        <p className="text-sm text-gray-500">{label}</p>
      </div>
    </div>
  );
}

function QueueCard({ label, value, severity, link }: any) {
  const bg = severity === 'high' ? 'border-l-4 border-l-red-500' : 'border-l-4 border-l-yellow-500';
  return (
    <Link to={link} className={`card ${bg} hover:shadow-md transition-shadow`}>
      <p className="text-2xl font-bold">{value ?? 0}</p>
      <p className="text-sm text-gray-500">{label}</p>
    </Link>
  );
}

function MiniStat({ label, value, icon: Icon, alert }: any) {
  return (
    <div className={`card flex items-center gap-3 ${alert && value > 0 ? 'border-red-200 bg-red-50' : ''}`}>
      <Icon className={`h-4 w-4 ${alert && value > 0 ? 'text-red-500' : 'text-gray-400'}`} />
      <div>
        <p className="text-lg font-bold">{value ?? 0}</p>
        <p className="text-xs text-gray-500">{label}</p>
      </div>
    </div>
  );
}

function formatState(state: string) {
  return state.replace(/_/g, ' ').toLowerCase().replace(/^\w/, c => c.toUpperCase());
}

function stateColor(state: string) {
  if (state.includes('VALIDATED_PROOF')) return 'bg-green-500';
  if (state.includes('VALIDATED_RESERVE')) return 'bg-yellow-500';
  if (state.includes('PENDING')) return 'bg-orange-500';
  if (state.includes('REJECTED') || state.includes('EXCLUDED')) return 'bg-red-500';
  if (state.includes('ARCHIVED')) return 'bg-gray-500';
  return 'bg-blue-500';
}

function actionColor(action: string) {
  if (action === 'CREATE') return 'bg-green-500';
  if (action === 'UPDATE') return 'bg-blue-500';
  if (action === 'DELETE') return 'bg-red-500';
  if (action === 'VALIDATE') return 'bg-emerald-500';
  if (action === 'REJECT') return 'bg-red-500';
  return 'bg-gray-400';
}
