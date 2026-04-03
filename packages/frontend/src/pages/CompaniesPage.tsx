import { useEffect, useState } from 'react';
import { api } from '../services/api';
import { Building2, Plus } from 'lucide-react';

export default function CompaniesPage() {
  const [data, setData] = useState<any>({ data: [], meta: { total: 0 } });
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ code: '', name: '', legalForm: '', address: '' });

  useEffect(() => {
    api.getCompanies().then(setData).finally(() => setLoading(false));
  }, []);

  const handleCreate = async () => {
    try {
      await api.createCompany(form);
      setShowForm(false);
      setForm({ code: '', name: '', legalForm: '', address: '' });
      api.getCompanies().then(setData);
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Building2 className="h-6 w-6 text-sentinel-600" /> Sociétés
        </h1>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary flex items-center gap-1">
          <Plus className="h-4 w-4" /> Nouvelle société
        </button>
      </div>

      {showForm && (
        <div className="card space-y-3">
          <div className="grid md:grid-cols-2 gap-3">
            <input value={form.code} onChange={e => setForm({...form, code: e.target.value})} className="input-field" placeholder="Code (ex: SCI-01)" />
            <input value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="input-field" placeholder="Raison sociale" />
            <input value={form.legalForm} onChange={e => setForm({...form, legalForm: e.target.value})} className="input-field" placeholder="Forme juridique (SCI, SARL...)" />
            <input value={form.address} onChange={e => setForm({...form, address: e.target.value})} className="input-field" placeholder="Adresse" />
          </div>
          <div className="flex gap-2">
            <button onClick={handleCreate} className="btn-primary">Créer</button>
            <button onClick={() => setShowForm(false)} className="btn-secondary">Annuler</button>
          </div>
        </div>
      )}

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-3 text-center py-8 text-gray-400">Chargement...</div>
        ) : (
          data.data.map((c: any) => (
            <div key={c.id} className="card hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div>
                  <span className="badge-blue">{c.code}</span>
                  <h3 className="font-semibold mt-2">{c.name}</h3>
                  {c.legalForm && <p className="text-sm text-gray-500">{c.legalForm}</p>}
                  {c.address && <p className="text-sm text-gray-400 mt-1">{c.address}</p>}
                </div>
                <span className={c.isActive ? 'badge-green' : 'badge-red'}>{c.isActive ? 'Active' : 'Inactive'}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
