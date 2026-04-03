import { useEffect, useState } from 'react';
import { api } from '../services/api';
import { Users } from 'lucide-react';

export default function HRPage() {
  const [employees, setEmployees] = useState<any>({ data: [], meta: { total: 0 } });
  const [tasks, setTasks] = useState<any>({ data: [], meta: { total: 0 } });
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'employees' | 'tasks'>('employees');

  useEffect(() => {
    Promise.all([
      api.getEmployees(),
      api.getTasks(),
    ]).then(([e, t]) => {
      setEmployees(e);
      setTasks(t);
    }).finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold flex items-center gap-2">
        <Users className="h-6 w-6 text-sentinel-600" /> RH / SPI
      </h1>

      <div className="flex gap-2">
        <button onClick={() => setTab('employees')} className={tab === 'employees' ? 'btn-primary' : 'btn-secondary'}>
          Employés ({employees.meta.total})
        </button>
        <button onClick={() => setTab('tasks')} className={tab === 'tasks' ? 'btn-primary' : 'btn-secondary'}>
          Tâches SPI ({tasks.meta.total})
        </button>
      </div>

      {tab === 'employees' && (
        <div className="card overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Code</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Nom</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Poste</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Département</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Contrat</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Salaire base</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">Chargement...</td></tr>
              ) : (
                employees.data.map((e: any) => (
                  <tr key={e.id} className="border-b hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono">{e.code}</td>
                    <td className="px-4 py-3 font-medium">{e.firstName} {e.lastName}</td>
                    <td className="px-4 py-3">{e.position || '-'}</td>
                    <td className="px-4 py-3">{e.department || '-'}</td>
                    <td className="px-4 py-3"><span className="badge-gray">{e.contractType || '-'}</span></td>
                    <td className="px-4 py-3 text-right font-mono">{e.baseSalary ? Number(e.baseSalary).toLocaleString('fr-FR') : '-'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'tasks' && (
        <div className="card overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Code</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Titre</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Employé</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Type</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Prix convenu</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Statut</th>
              </tr>
            </thead>
            <tbody>
              {tasks.data.map((t: any) => (
                <tr key={t.id} className="border-b hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono">{t.code}</td>
                  <td className="px-4 py-3">{t.title}</td>
                  <td className="px-4 py-3">{t.employee?.firstName} {t.employee?.lastName}</td>
                  <td className="px-4 py-3"><span className="badge-blue">{t.taskType}</span></td>
                  <td className="px-4 py-3 text-right font-mono">{t.agreedPrice ? Number(t.agreedPrice).toLocaleString('fr-FR') : '-'}</td>
                  <td className="px-4 py-3">
                    <span className={
                      t.status === 'PAID' ? 'badge-green' :
                      t.status === 'QC_FAIL' ? 'badge-red' :
                      t.status === 'IN_PROGRESS' ? 'badge-blue' : 'badge-gray'
                    }>{t.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
