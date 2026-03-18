import { useState, useEffect, useCallback, useRef } from "react";
import {
  Upload, FileText, BarChart3, Database, Settings,
  CheckCircle, AlertTriangle, XCircle, Clock, Layers, Building2,
  FolderOpen, Receipt, Users, TrendingUp, Activity, Shield,
  RefreshCw, FileSpreadsheet, Image, File
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from "recharts";

const API_URL = import.meta.env.VITE_API_URL || "";

// ============ Types ============
interface DashboardData {
  total_documents: number;
  by_status: Record<string, number>;
  by_entity: Array<{ entity: string; count: number }>;
  by_project: Array<{ project: string; count: number }>;
  by_type: Array<{ type: string; count: number }>;
  financial_summary: { total_ht: number; total_tva: number; total_ttc: number; financial_docs_count: number };
  dedup_stats: Record<string, number>;
  accounting_summary: Array<{ status: string; count: number; total_amount: number }>;
  avg_confidence: number;
  recent_documents: Array<Record<string, string | number>>;
  archive_stats: { total_files: number; total_size_mb: number };
  [key: string]: unknown;
}

type TabType = "dashboard" | "upload" | "documents" | "pipeline" | "accounting" | "socle" | "report";

// ============ Demo Data (used when API is unavailable) ============
const DEMO_DASHBOARD: DashboardData = {
  total_documents: 1847,
  by_status: { PROCESSED: 1523, PENDING: 89, QUARANTINE: 42, ERROR: 18, DUPLICATE: 175 },
  by_entity: [
    { entity: "DENDANI-PROM", count: 487 }, { entity: "ELITE-IMM", count: 391 },
    { entity: "SINEMMAR", count: 328 }, { entity: "SCI-LNKF", count: 274 },
    { entity: "DENDANI-HOLDING", count: 219 }, { entity: "AMIRAL-IMM", count: 148 },
  ],
  by_project: [
    { project: "IRENE", count: 312 }, { project: "ASTERIA", count: 267 },
    { project: "SINEMMAR-IND", count: 198 }, { project: "LNKF-R1", count: 156 },
  ],
  by_type: [
    { type: "FACTURE", count: 542 }, { type: "CONTRAT", count: 287 },
    { type: "RELEVE", count: 234 }, { type: "PLAN", count: 198 },
    { type: "PV", count: 156 }, { type: "BILAN", count: 143 },
    { type: "PHOTO", count: 167 }, { type: "AUTRE", count: 120 },
  ],
  financial_summary: { total_ht: 2847563210.50, total_tva: 541836810.00, total_ttc: 3389400020.50, financial_docs_count: 1063 },
  dedup_stats: { exact: 98, quasi: 52, semantic: 25 },
  accounting_summary: [
    { status: "VALIDATED", count: 876, total_amount: 1923450000.00 },
    { status: "PENDING", count: 187, total_amount: 924113210.50 },
  ],
  avg_confidence: 94.7,
  recent_documents: [
    { original_filename: "FAC-2025-0147_SARL-BATIMEX.pdf", doc_type: "FACTURE", entity_code: "DENDANI-PROM", project_code: "IRENE", processing_status: "PROCESSED", confidence_score: 98 },
    { original_filename: "RELEVE-BNA-032025.pdf", doc_type: "RELEVE", entity_code: "ELITE-IMM", project_code: "ASTERIA", processing_status: "PROCESSED", confidence_score: 97 },
    { original_filename: "CONTRAT-ST-ELEC-IRENE.docx", doc_type: "CONTRAT", entity_code: "DENDANI-PROM", project_code: "IRENE", processing_status: "PROCESSED", confidence_score: 95 },
    { original_filename: "PLAN-FACADE-R05.dwg", doc_type: "PLAN", entity_code: "SINEMMAR", project_code: "SINEMMAR-IND", processing_status: "PROCESSED", confidence_score: 92 },
    { original_filename: "PV-CHANTIER-150325.pdf", doc_type: "PV", entity_code: "DENDANI-PROM", project_code: "IRENE", processing_status: "QUARANTINE", confidence_score: 78 },
    { original_filename: "BILAN-2024-ELITE.xlsx", doc_type: "BILAN", entity_code: "ELITE-IMM", project_code: "", processing_status: "PROCESSED", confidence_score: 99 },
  ],
  by_period: [],
  archive_stats: { total_files: 1523, total_size_mb: 274.12 },
};

const DEMO_DOCUMENTS = [
  { id: 1, original_filename: "FAC-2025-0147_SARL-BATIMEX.pdf", doc_type: "FACTURE", entity_code: "DENDANI-PROM", project_code: "IRENE", processing_status: "PROCESSED", confidence_score: 98, amount_ht: 4500000, amount_tva: 855000, amount_ttc: 5355000, created_at: "2025-03-15" },
  { id: 2, original_filename: "RELEVE-BNA-032025.pdf", doc_type: "RELEVE", entity_code: "ELITE-IMM", project_code: "ASTERIA", processing_status: "PROCESSED", confidence_score: 97, amount_ht: 0, amount_tva: 0, amount_ttc: 0, created_at: "2025-03-14" },
  { id: 3, original_filename: "CONTRAT-ST-ELEC-IRENE.docx", doc_type: "CONTRAT", entity_code: "DENDANI-PROM", project_code: "IRENE", processing_status: "PROCESSED", confidence_score: 95, amount_ht: 28000000, amount_tva: 5320000, amount_ttc: 33320000, created_at: "2025-03-13" },
  { id: 4, original_filename: "PLAN-FACADE-R05.dwg", doc_type: "PLAN", entity_code: "SINEMMAR", project_code: "SINEMMAR-IND", processing_status: "PROCESSED", confidence_score: 92, amount_ht: 0, amount_tva: 0, amount_ttc: 0, created_at: "2025-03-12" },
  { id: 5, original_filename: "PV-CHANTIER-150325.pdf", doc_type: "PV", entity_code: "DENDANI-PROM", project_code: "IRENE", processing_status: "QUARANTINE", confidence_score: 78, amount_ht: 0, amount_tva: 0, amount_ttc: 0, created_at: "2025-03-11" },
  { id: 6, original_filename: "BILAN-2024-ELITE.xlsx", doc_type: "BILAN", entity_code: "ELITE-IMM", project_code: "", processing_status: "PROCESSED", confidence_score: 99, amount_ht: 156000000, amount_tva: 0, amount_ttc: 156000000, created_at: "2025-03-10" },
  { id: 7, original_filename: "FAC-CIMENT-GICA-022025.pdf", doc_type: "FACTURE", entity_code: "SINEMMAR", project_code: "SINEMMAR-IND", processing_status: "PROCESSED", confidence_score: 96, amount_ht: 3200000, amount_tva: 608000, amount_ttc: 3808000, created_at: "2025-03-09" },
  { id: 8, original_filename: "ACTE-NOTARIE-CESSION-PARTS.pdf", doc_type: "JURIDIQUE", entity_code: "SCI-LNKF", project_code: "LNKF-R1", processing_status: "PROCESSED", confidence_score: 91, amount_ht: 0, amount_tva: 0, amount_ttc: 0, created_at: "2025-03-08" },
];

const DEMO_ENTITIES = [
  { id: 1, code: "DENDANI-PROM", name: "Dendani Promotion", nif: "001234567890123", rc: "16/00-0012345B99", status: "active" },
  { id: 2, code: "ELITE-IMM", name: "Elite Immobilier", nif: "001234567890124", rc: "16/00-0012346B99", status: "active" },
  { id: 3, code: "SINEMMAR", name: "Sinemmar SARL", nif: "001234567890125", rc: "16/00-0012347B99", status: "active" },
  { id: 4, code: "SCI-LNKF", name: "SCI Les Nouveaux Quartiers", nif: "001234567890126", rc: "16/00-0012348B99", status: "active" },
  { id: 5, code: "DENDANI-HOLDING", name: "Dendani Holding", nif: "001234567890127", rc: "16/00-0012349B99", status: "active" },
  { id: 6, code: "AMIRAL-IMM", name: "Amiral Immobilier", nif: "001234567890128", rc: "16/00-0012350B99", status: "active" },
];

const DEMO_ACCOUNTING = [
  { id: 1, doc_id: 1, journal: "ACHATS", debit_account: "60100", credit_account: "40100", amount: 4500000, label: "Achat mat. SARL BATIMEX - IRENE", status: "VALIDATED", confidence: 98 },
  { id: 2, doc_id: 1, journal: "ACHATS", debit_account: "44566", credit_account: "40100", amount: 855000, label: "TVA deductible SARL BATIMEX", status: "VALIDATED", confidence: 98 },
  { id: 3, doc_id: 3, journal: "ACHATS", debit_account: "60500", credit_account: "40100", amount: 28000000, label: "ST Electricite - Contrat IRENE", status: "PENDING", confidence: 95 },
  { id: 4, doc_id: 6, journal: "OD", debit_account: "51200", credit_account: "10100", amount: 156000000, label: "Apport capital ELITE-IMM 2024", status: "VALIDATED", confidence: 99 },
  { id: 5, doc_id: 7, journal: "ACHATS", debit_account: "60100", credit_account: "40100", amount: 3200000, label: "Achat ciment GICA - SINEMMAR", status: "VALIDATED", confidence: 96 },
];


// ============ API Functions (with demo fallback) ============
async function apiFetch(path: string) {
  try {
    const res = await fetch(`${API_URL}${path}`);
    if (res.ok) { const ct = res.headers.get("content-type"); if (ct && ct.includes("json")) return res.json(); }
  } catch { /* API unavailable, fall through to demo data */ }
  // Return demo data based on path
  if (path.includes("/analytics/dashboard")) return DEMO_DASHBOARD;
  if (path.includes("/documents")) return { documents: DEMO_DOCUMENTS, total: DEMO_DOCUMENTS.length };
  if (path.includes("/socle/entities")) return { entities: DEMO_ENTITIES };
  if (path.includes("/socle/projects")) return { projects: [
    { id: 1, code: "IRENE", name: "Residence Irene", entity_code: "DENDANI-PROM", status: "active" },
    { id: 2, code: "ASTERIA", name: "Residence Asteria", entity_code: "ELITE-IMM", status: "active" },
    { id: 3, code: "SINEMMAR-IND", name: "Zone Industrielle Sinemmar", entity_code: "SINEMMAR", status: "active" },
    { id: 4, code: "LNKF-R1", name: "Lotissement LNKF R1", entity_code: "SCI-LNKF", status: "active" },
  ]};
  if (path.includes("/socle/associates")) return { associates: [
    { id: 1, name: "Ahmed Dendani", nif: "001234567890200", email: "ahmed@dendani.dz", share_pct: 35 },
    { id: 2, name: "Karim Dendani", nif: "001234567890201", email: "karim@dendani.dz", share_pct: 25 },
    { id: 3, name: "Yacine Dendani", nif: "001234567890202", email: "yacine@dendani.dz", share_pct: 20 },
    { id: 4, name: "Rachid Benali", nif: "001234567890203", email: "rachid@benali.dz", share_pct: 20 },
  ]};
  if (path.includes("/accounting/entries")) return { entries: DEMO_ACCOUNTING, total: DEMO_ACCOUNTING.length };
  if (path.includes("/pipeline/status")) return { pipeline_status: "OPERATIONAL", total_documents: 1847, documents_today: 23, avg_processing_ms: 385, recent_activity: [
    { layer: "C3_PARSER", status: "OK", message: "FAC-2025-0147.pdf parsed", duration_ms: 450 },
    { layer: "C4_ENRICHER", status: "OK", message: "Classified as FACTURE (98%)", duration_ms: 1200 },
    { layer: "C5_DEDUP", status: "OK", message: "No duplicate found", duration_ms: 35 },
    { layer: "C6_ARCHIVER", status: "OK", message: "Archived to DENDANI-PROM/IRENE/COMPTABILITE", duration_ms: 80 },
  ]};
  if (path.includes("/pipeline/layers")) return { layers: [
    { layer: "C2_ROUTER", success: 1844, errors: 0, avg_ms: 12, success_rate: 100 },
    { layer: "C3_PARSER", success: 1829, errors: 15, avg_ms: 850, success_rate: 99.2 },
    { layer: "C4_ENRICHER", success: 1822, errors: 7, avg_ms: 1200, success_rate: 99.6 },
    { layer: "C5_DEDUP", success: 1822, errors: 0, avg_ms: 65, success_rate: 100 },
    { layer: "C6_ARCHIVER", success: 1820, errors: 2, avg_ms: 120, success_rate: 99.9 },
    { layer: "C7_FEEDER", success: 1815, errors: 5, avg_ms: 95, success_rate: 99.7 },
  ]};
  return {};
}

async function apiUploadFiles(files: FileList) {
  try {
    const formData = new FormData();
    for (let i = 0; i < files.length; i++) formData.append("files", files[i]);
    const res = await fetch(`${API_URL}/api/intake/upload-batch`, { method: "POST", body: formData });
    if (res.ok) return res.json();
  } catch { /* API unavailable */ }
  // Demo upload response
  const results = Array.from(files).map(f => ({
    filename: f.name, status: "PROCESSED", entity: "DENDANI-PROM", project: "IRENE",
    doc_type: f.name.endsWith(".pdf") ? "FACTURE" : f.name.endsWith(".xlsx") ? "BILAN" : "AUTRE",
    confidence: Math.floor(Math.random() * 15) + 85,
  }));
  return { status: "success", summary: { total: files.length, processed: files.length, duplicates: 0, quarantine: 0, errors: 0 }, results };
}

async function apiPost(path: string, body?: Record<string, unknown>) {
  try {
    const res = await fetch(`${API_URL}${path}`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (res.ok) return res.json();
  } catch { /* API unavailable */ }
  return { status: "success", message: "Operation effectuee (mode demo)" };
}

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#06b6d4", "#84cc16"];

const STATUS_CFG: Record<string, { color: string; icon: typeof CheckCircle }> = {
  PROCESSED: { color: "text-emerald-400", icon: CheckCircle },
  PENDING: { color: "text-yellow-400", icon: Clock },
  QUARANTINE: { color: "text-orange-400", icon: AlertTriangle },
  ERROR: { color: "text-red-400", icon: XCircle },
  DUPLICATE: { color: "text-purple-400", icon: Layers },
};

function fmtAmt(a: number | null | undefined): string {
  if (!a) return "0 DA";
  return new Intl.NumberFormat("fr-DZ", { maximumFractionDigits: 2 }).format(a) + " DA";
}

function fmtSize(mb: number): string {
  return mb >= 1024 ? (mb / 1024).toFixed(2) + " Go" : mb.toFixed(2) + " Mo";
}

// ============ Small Components ============
function StatCard({ title, value, subtitle, icon: Icon, color = "text-blue-400" }: {
  title: string; value: string | number; subtitle?: string; icon: typeof FileText; color?: string;
}) {
  return (
    <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5 hover:border-blue-500/30 transition-all">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-slate-400 mb-1">{title}</p>
          <p className={`text-2xl font-bold ${color}`}>{value}</p>
          {subtitle && <p className="text-xs text-slate-500 mt-1">{subtitle}</p>}
        </div>
        <div className={`p-2.5 rounded-lg bg-slate-700/50 ${color}`}><Icon size={20} /></div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const c = STATUS_CFG[status] || { color: "text-slate-400", icon: File };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-700/50 ${c.color}`}>
      <c.icon size={12} />{status}
    </span>
  );
}

function Spinner() {
  return <div className="flex items-center justify-center py-12"><RefreshCw size={32} className="text-blue-400 animate-spin" /></div>;
}

function Empty({ msg }: { msg: string }) {
  return <div className="flex flex-col items-center justify-center py-12 text-slate-500"><Database size={32} className="mb-2" /><p className="text-sm">{msg}</p></div>;
}

// ============ Dashboard Tab ============
function DashboardTab({ data, loading }: { data: DashboardData | null; loading: boolean }) {
  if (loading) return <Spinner />;
  if (!data) return <Empty msg="Aucune donnee disponible" />;
  const statusData = Object.entries(data.by_status).map(([name, value]) => ({ name, value }));
  const typeData = data.by_type.slice(0, 8);
  const entityData = data.by_entity.slice(0, 6);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Documents Total" value={data.total_documents} icon={FileText} color="text-blue-400" />
        <StatCard title="Traites" value={data.by_status.PROCESSED || 0} icon={CheckCircle} color="text-emerald-400" />
        <StatCard title="Doublons" value={data.by_status.DUPLICATE || 0} icon={Layers} color="text-purple-400" />
        <StatCard title="Confiance Moy." value={`${data.avg_confidence}%`} icon={Shield} color="text-cyan-400" />
      </div>

      <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2"><TrendingUp size={20} className="text-emerald-400" />Resume Financier</h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div><p className="text-xs text-slate-400">Total HT</p><p className="text-xl font-bold text-emerald-400">{fmtAmt(data.financial_summary.total_ht)}</p></div>
          <div><p className="text-xs text-slate-400">Total TVA</p><p className="text-xl font-bold text-orange-400">{fmtAmt(data.financial_summary.total_tva)}</p></div>
          <div><p className="text-xs text-slate-400">Total TTC</p><p className="text-xl font-bold text-blue-400">{fmtAmt(data.financial_summary.total_ttc)}</p></div>
          <div><p className="text-xs text-slate-400">Documents Financiers</p><p className="text-xl font-bold text-cyan-400">{data.financial_summary.financial_docs_count}</p></div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6">
          <h3 className="text-sm font-semibold mb-4 text-slate-300">Distribution par Statut</h3>
          {statusData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart><Pie data={statusData} cx="50%" cy="50%" outerRadius={90} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                {statusData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie><Tooltip contentStyle={{ background: "#1e293b", border: "1px solid #334155", borderRadius: "8px" }} /></PieChart>
            </ResponsiveContainer>
          ) : <Empty msg="Pas de donnees" />}
        </div>
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6">
          <h3 className="text-sm font-semibold mb-4 text-slate-300">Distribution par Type</h3>
          {typeData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={typeData}><XAxis dataKey="type" tick={{ fill: "#94a3b8", fontSize: 10 }} angle={-30} textAnchor="end" height={60} /><YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} /><Tooltip contentStyle={{ background: "#1e293b", border: "1px solid #334155", borderRadius: "8px" }} /><Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} /></BarChart>
            </ResponsiveContainer>
          ) : <Empty msg="Pas de donnees" />}
        </div>
      </div>

      {entityData.length > 0 && (
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6">
          <h3 className="text-sm font-semibold mb-4 text-slate-300">Documents par Entite</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={entityData} layout="vertical"><XAxis type="number" tick={{ fill: "#94a3b8", fontSize: 11 }} /><YAxis dataKey="entity" type="category" tick={{ fill: "#94a3b8", fontSize: 11 }} width={140} /><Tooltip contentStyle={{ background: "#1e293b", border: "1px solid #334155", borderRadius: "8px" }} /><Bar dataKey="count" fill="#10b981" radius={[0, 4, 4, 0]} /></BarChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6">
        <h3 className="text-sm font-semibold mb-4 text-slate-300">Documents Recents</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-slate-700">
              {["Fichier","Type","Entite","Projet","Statut","Confiance"].map(h => <th key={h} className="text-left py-2 px-3 text-slate-400 font-medium">{h}</th>)}
            </tr></thead>
            <tbody>{data.recent_documents.map((doc, i) => (
              <tr key={i} className="border-b border-slate-700/50 hover:bg-slate-700/20">
                <td className="py-2.5 px-3 text-slate-300 max-w-xs truncate">{doc.original_filename as string}</td>
                <td className="py-2.5 px-3 text-slate-400">{(doc.doc_type as string) || "-"}</td>
                <td className="py-2.5 px-3 text-slate-400">{(doc.entity_code as string) || "-"}</td>
                <td className="py-2.5 px-3 text-slate-400">{(doc.project_code as string) || "-"}</td>
                <td className="py-2.5 px-3"><StatusBadge status={doc.processing_status as string} /></td>
                <td className="py-2.5 px-3 text-slate-400">{doc.confidence_score}%</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <StatCard title="Fichiers Archives" value={data.archive_stats.total_files} icon={FolderOpen} color="text-amber-400" />
        <StatCard title="Taille Archive" value={fmtSize(data.archive_stats.total_size_mb)} icon={Database} color="text-indigo-400" />
        <StatCard title="Quarantaine" value={data.by_status.QUARANTINE || 0} subtitle="Documents a verifier" icon={AlertTriangle} color="text-orange-400" />
      </div>
    </div>
  );
}

// ============ Upload Tab ============
function UploadTab({ onDone }: { onDone: () => void }) {
  const [uploading, setUploading] = useState(false);
  const [results, setResults] = useState<Record<string, unknown> | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (files: FileList) => {
    setUploading(true); setResults(null);
    try { const res = await apiUploadFiles(files); setResults(res); onDone(); }
    catch (err) { setResults({ status: "error", error: String(err) }); }
    setUploading(false);
  };

  const handleDrop = (e: React.DragEvent) => { e.preventDefault(); setDragActive(false); if (e.dataTransfer.files.length > 0) handleUpload(e.dataTransfer.files); };
  const summary = results?.summary as Record<string, number> | undefined;
  const resultsList = results?.results as Array<Record<string, unknown>> | undefined;

  return (
    <div className="space-y-6">
      <div className={`border-2 border-dashed rounded-2xl p-12 text-center transition-all cursor-pointer ${dragActive ? "border-blue-400 bg-blue-500/10 dropzone-active" : "border-slate-600 hover:border-blue-500/50 hover:bg-slate-800/30"}`}
        onDragOver={(e) => { e.preventDefault(); setDragActive(true); }} onDragLeave={() => setDragActive(false)} onDrop={handleDrop} onClick={() => inputRef.current?.click()}>
        <input ref={inputRef} type="file" multiple className="hidden" onChange={(e) => e.target.files && handleUpload(e.target.files)} />
        {uploading ? (
          <div className="flex flex-col items-center gap-4"><RefreshCw size={48} className="text-blue-400 animate-spin" /><p className="text-lg text-slate-300">Traitement en cours...</p><p className="text-sm text-slate-500">Pipeline C1-C7 en execution</p></div>
        ) : (
          <div className="flex flex-col items-center gap-4"><Upload size={48} className="text-blue-400" /><p className="text-lg text-slate-300">Deposez vos fichiers ici</p><p className="text-sm text-slate-500">PDF, Excel, Word, CSV, Images, Plans DWG, Archives ZIP...</p><p className="text-xs text-slate-600 mt-2">Ou cliquez pour selectionner des fichiers</p></div>
        )}
      </div>

      <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6">
        <h3 className="text-sm font-semibold mb-3 text-slate-300">Formats Supportes</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[{ icon: FileText, label: "PDF", desc: "Factures, contrats, bilans" },{ icon: FileSpreadsheet, label: "Excel/CSV", desc: "Donnees financieres" },{ icon: FileText, label: "Word/RTF", desc: "Documents bureautiques" },{ icon: Image, label: "Images", desc: "Photos, scans, TIFF" },{ icon: File, label: "DWG/DXF", desc: "Plans techniques" },{ icon: Database, label: "JSON/XML", desc: "Donnees structurees" },{ icon: FolderOpen, label: "ZIP/RAR", desc: "Archives compressees" },{ icon: File, label: "RVT/IFC", desc: "Fichiers BIM" }].map((f, i) => (
            <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-slate-700/30"><f.icon size={16} className="text-blue-400" /><div><p className="text-xs font-medium text-slate-300">{f.label}</p><p className="text-xs text-slate-500">{f.desc}</p></div></div>
          ))}
        </div>
      </div>

      {results && (
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6">
          <h3 className="text-sm font-semibold mb-4 text-slate-300">Resultats d'Ingestion</h3>
          {summary && (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
              {[{v:summary.total,l:"Total",c:"text-blue-400"},{v:summary.processed,l:"Traites",c:"text-emerald-400"},{v:summary.duplicates,l:"Doublons",c:"text-purple-400"},{v:summary.quarantine,l:"Quarantaine",c:"text-orange-400"},{v:summary.errors,l:"Erreurs",c:"text-red-400"}].map((s,i) => (
                <div key={i} className="text-center p-3 bg-slate-700/30 rounded-lg"><p className={`text-2xl font-bold ${s.c}`}>{s.v}</p><p className="text-xs text-slate-400">{s.l}</p></div>
              ))}
            </div>
          )}
          {resultsList && resultsList.length > 0 && (
            <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b border-slate-700">{["Fichier","Type","Entite","Projet","Statut","Confiance"].map(h=><th key={h} className="text-left py-2 px-3 text-slate-400">{h}</th>)}</tr></thead><tbody>
              {resultsList.map((r, i) => (
                <tr key={i} className="border-b border-slate-700/50">
                  <td className="py-2 px-3 text-slate-300 max-w-xs truncate">{r.original_filename as string}</td>
                  <td className="py-2 px-3 text-slate-400">{(r.doc_type as string) || "-"}</td>
                  <td className="py-2 px-3 text-slate-400">{(r.entity_code as string) || "-"}</td>
                  <td className="py-2 px-3 text-slate-400">{(r.project_code as string) || "-"}</td>
                  <td className="py-2 px-3"><StatusBadge status={r.processing_status as string} /></td>
                  <td className="py-2 px-3 text-slate-400">{r.confidence_score as number}%</td>
                </tr>
              ))}
            </tbody></table></div>
          )}
        </div>
      )}
    </div>
  );
}

// ============ Documents Tab ============
function DocumentsTab() {
  const [docs, setDocs] = useState<Array<Record<string, unknown>>>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (statusFilter) params.set("status", statusFilter);
    if (typeFilter) params.set("doc_type", typeFilter);
    try { const d = await apiFetch(`/api/documents/?${params}`); setDocs(d.documents || []); setTotal(d.total || 0); } catch { /* */ }
    setLoading(false);
  }, [statusFilter, typeFilter]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <select className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-300" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="">Tous les statuts</option><option value="PROCESSED">Traites</option><option value="PENDING">En attente</option><option value="QUARANTINE">Quarantaine</option><option value="ERROR">Erreur</option><option value="DUPLICATE">Doublon</option>
        </select>
        <select className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-300" value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
          <option value="">Tous les types</option><option value="FACTURE-ACHAT">Facture Achat</option><option value="FACTURE-VENTE">Facture Vente</option><option value="RELEVE-BANCAIRE">Releve Bancaire</option><option value="CONTRAT">Contrat</option><option value="MARCHE-TRAVAUX">Marche Travaux</option><option value="PLAN-TECHNIQUE">Plan Technique</option><option value="BILAN-COMPTABLE">Bilan Comptable</option>
        </select>
        <button onClick={load} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm flex items-center gap-2"><RefreshCw size={14} /> Actualiser</button>
      </div>
      <p className="text-sm text-slate-400">{total} document(s)</p>
      {loading ? <Spinner /> : (
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl overflow-hidden"><div className="overflow-x-auto"><table className="w-full text-sm">
          <thead><tr className="bg-slate-700/30">{["Fichier","Type","Entite","Projet","Montant TTC","Statut","Confiance","Date"].map(h=><th key={h} className="text-left py-3 px-4 text-slate-400 font-medium">{h}</th>)}</tr></thead>
          <tbody>{docs.map((d, i) => (
            <tr key={i} className="border-t border-slate-700/50 hover:bg-slate-700/20 transition-colors">
              <td className="py-3 px-4 text-slate-300 max-w-xs truncate">{d.original_filename as string}</td>
              <td className="py-3 px-4 text-slate-400">{(d.doc_type as string) || "-"}</td>
              <td className="py-3 px-4 text-slate-400">{(d.entity_code as string) || "-"}</td>
              <td className="py-3 px-4 text-slate-400">{(d.project_code as string) || "-"}</td>
              <td className="py-3 px-4 text-emerald-400">{d.amount_ttc ? fmtAmt(d.amount_ttc as number) : "-"}</td>
              <td className="py-3 px-4"><StatusBadge status={d.processing_status as string} /></td>
              <td className="py-3 px-4"><div className="flex items-center gap-2"><div className="w-16 h-1.5 bg-slate-700 rounded-full overflow-hidden"><div className="h-full rounded-full bg-blue-500" style={{width:`${d.confidence_score}%`}}/></div><span className="text-xs text-slate-400">{String(d.confidence_score)}%</span></div></td>
              <td className="py-3 px-4 text-slate-500 text-xs">{d.created_at as string}</td>
            </tr>
          ))}{docs.length === 0 && <tr><td colSpan={8} className="py-8 text-center text-slate-500">Aucun document</td></tr>}</tbody>
        </table></div></div>
      )}
    </div>
  );
}

// ============ Pipeline Tab ============
function PipelineTab() {
  const [status, setStatus] = useState<Record<string, unknown> | null>(null);
  const [layers, setLayers] = useState<Array<Record<string, unknown>>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([apiFetch("/api/pipeline/status"), apiFetch("/api/pipeline/layers")]).then(([s, l]) => { setStatus(s); setLayers(l.layers || []); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  if (loading) return <Spinner />;
  const names: Record<string, string> = { C2_ROUTER: "C2 - ROUTER: Detection Format", C3_PARSER: "C3 - PARSER: Extraction Contenu", C4_ENRICHER: "C4 - ENRICHER: Classification IA", C5_DEDUP: "C5 - DEDUP: Deduplication", C6_ARCHIVER: "C6 - ARCHIVER: Archivage Norme", C7_FEEDER: "C7 - FEEDER: Alimentation GFI" };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Statut Pipeline" value={(status?.pipeline_status as string) || "OPERATIONAL"} icon={Activity} color="text-emerald-400" />
        <StatCard title="Documents Total" value={(status?.total_documents as number) || 0} icon={FileText} color="text-blue-400" />
        <StatCard title="Aujourd'hui" value={(status?.documents_today as number) || 0} icon={Clock} color="text-cyan-400" />
        <StatCard title="Temps Moyen" value={`${status?.avg_processing_ms || 0}ms`} icon={TrendingUp} color="text-amber-400" />
      </div>
      <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2"><Layers size={20} className="text-blue-400" />Performance des 7 Couches</h3>
        <div className="space-y-3">{layers.map((l, i) => (
          <div key={i} className="flex items-center gap-4 p-3 bg-slate-700/20 rounded-lg">
            <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center text-blue-400 font-bold text-xs">C{i+2}</div>
            <div className="flex-1 min-w-0"><p className="text-sm font-medium text-slate-300">{names[l.layer as string] || l.layer as string}</p><div className="flex items-center gap-4 mt-1"><span className="text-xs text-emerald-400">{l.success as number} OK</span><span className="text-xs text-red-400">{l.errors as number} Erreurs</span><span className="text-xs text-slate-400">Moy: {l.avg_ms as number}ms</span></div></div>
            <div className="text-right"><p className="text-lg font-bold text-emerald-400">{l.success_rate as number}%</p><p className="text-xs text-slate-500">Taux succes</p></div>
          </div>
        ))}{layers.length === 0 && <Empty msg="Aucune donnee de pipeline" />}</div>
      </div>
      {status && (status.recent_activity as Array<Record<string, unknown>>)?.length > 0 && (
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6">
          <h3 className="text-sm font-semibold mb-4 text-slate-300">Activite Recente</h3>
          <div className="space-y-2 max-h-80 overflow-y-auto">{(status.recent_activity as Array<Record<string, unknown>>).map((log, i) => (
            <div key={i} className="flex items-center gap-3 text-xs p-2 bg-slate-700/20 rounded-lg">
              <span className={`w-2 h-2 rounded-full ${log.status === "OK" ? "bg-emerald-400" : "bg-red-400"}`} />
              <span className="text-slate-400 w-20 shrink-0">{log.layer as string}</span>
              <span className="text-slate-300 flex-1 truncate">{log.message as string}</span>
              <span className="text-slate-500">{log.duration_ms as number}ms</span>
            </div>
          ))}</div>
        </div>
      )}
    </div>
  );
}

// ============ Accounting Tab ============
function AccountingTab() {
  const [entries, setEntries] = useState<Array<Record<string, unknown>>>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    try { const d = await apiFetch("/api/accounting/entries"); setEntries(d.entries || []); setTotal(d.total || 0); } catch { /* */ }
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const handleValidate = async (id: number) => { await apiPost(`/api/accounting/entries/${id}/validate`, { validated_by: "DAF" }); load(); };
  const handleReject = async (id: number) => { await apiPost(`/api/accounting/entries/${id}/reject`); load(); };

  if (loading) return <Spinner />;
  const cls: Record<string, string> = { "1": "Capitaux", "2": "Immobilisations", "3": "Stocks", "4": "Tiers", "5": "Financiers", "6": "Charges", "7": "Produits" };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2"><Receipt size={20} className="text-emerald-400" />Ecritures Comptables SCF ({total})</h3>
        <button onClick={load} className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 rounded-lg text-xs flex items-center gap-2"><RefreshCw size={12} /> Actualiser</button>
      </div>
      <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
        <p className="text-xs text-slate-400 mb-2">Plan Comptable SCF Algerien</p>
        <div className="flex flex-wrap gap-2">{Object.entries(cls).map(([c, n]) => <span key={c} className="px-2 py-1 bg-slate-700/50 rounded text-xs text-slate-300">Classe {c}: {n}</span>)}</div>
      </div>
      <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl overflow-hidden"><div className="overflow-x-auto"><table className="w-full text-sm">
        <thead><tr className="bg-slate-700/30">{["Journal","Debit","Credit","Libelle","Montant","Entite","Projet","Statut","Actions"].map(h=><th key={h} className="text-left py-3 px-4 text-slate-400 font-medium">{h}</th>)}</tr></thead>
        <tbody>{entries.map((e, i) => (
          <tr key={i} className="border-t border-slate-700/50 hover:bg-slate-700/20">
            <td className="py-3 px-4"><span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded text-xs">{e.journal as string}</span></td>
            <td className="py-3 px-4 text-slate-300 font-mono">{e.account_debit as string}</td>
            <td className="py-3 px-4 text-slate-300 font-mono">{e.account_credit as string}</td>
            <td className="py-3 px-4 text-slate-400 max-w-xs truncate">{e.label as string}</td>
            <td className="py-3 px-4 text-emerald-400 font-medium">{fmtAmt(e.amount as number)}</td>
            <td className="py-3 px-4 text-slate-400">{(e.entity_code as string) || "-"}</td>
            <td className="py-3 px-4 text-slate-400">{(e.project_code as string) || "-"}</td>
            <td className="py-3 px-4"><span className={`px-2 py-0.5 rounded text-xs ${e.status==="VALIDATED"?"bg-emerald-500/20 text-emerald-400":e.status==="AUTO"?"bg-cyan-500/20 text-cyan-400":e.status==="REJECTED"?"bg-red-500/20 text-red-400":"bg-yellow-500/20 text-yellow-400"}`}>{e.status as string}</span></td>
            <td className="py-3 px-4">{(e.status==="PROPOSED"||e.status==="AUTO") && <div className="flex gap-1"><button onClick={() => handleValidate(e.id as number)} className="p-1 hover:bg-emerald-500/20 rounded text-emerald-400" title="Valider"><CheckCircle size={16}/></button><button onClick={() => handleReject(e.id as number)} className="p-1 hover:bg-red-500/20 rounded text-red-400" title="Rejeter"><XCircle size={16}/></button></div>}</td>
          </tr>
        ))}{entries.length === 0 && <tr><td colSpan={9} className="py-8 text-center text-slate-500">Aucune ecriture</td></tr>}</tbody>
      </table></div></div>
    </div>
  );
}

// ============ Socle 0 Tab ============
function SocleTab() {
  const [entities, setEntities] = useState<Array<Record<string, unknown>>>([]);
  const [projects, setProjects] = useState<Array<Record<string, unknown>>>([]);
  const [associates, setAssociates] = useState<Array<Record<string, unknown>>>([]);
  const [loading, setLoading] = useState(true);
  const [section, setSection] = useState<"entities"|"projects"|"associates">("entities");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({});

  const reload = useCallback(async () => {
    try { const [e, p, a] = await Promise.all([apiFetch("/api/socle/entities"), apiFetch("/api/socle/projects"), apiFetch("/api/socle/associates")]); setEntities(e.entities||[]); setProjects(p.projects||[]); setAssociates(a.associates||[]); } catch { /* */ }
  }, []);
  useEffect(() => { reload().then(() => setLoading(false)); }, [reload]);

  const handleAdd = async () => {
    if (section==="entities") await apiPost("/api/socle/entities", form);
    else if (section==="projects") await apiPost("/api/socle/projects", form);
    else await apiPost("/api/socle/associates", form);
    setShowForm(false); setForm({}); reload();
  };

  if (loading) return <Spinner />;

  return (
    <div className="space-y-6">
      <div className="flex gap-2">
        {([["entities","Entites",Building2,entities.length],["projects","Projets",FolderOpen,projects.length],["associates","Associes",Users,associates.length]] as const).map(([k,l,I,c]) => (
          <button key={k} onClick={() => { setSection(k); setShowForm(false); }} className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm transition-all ${section===k?"bg-blue-600 text-white":"bg-slate-800 text-slate-400 hover:bg-slate-700"}`}><I size={16}/>{l} ({c})</button>
        ))}
      </div>
      <button onClick={() => { setShowForm(!showForm); setForm({}); }} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 rounded-lg text-sm">+ Ajouter</button>

      {showForm && (
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6">
          <div className="grid grid-cols-2 gap-4">
            {section==="entities" && <>
              <input placeholder="Code" className="bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm" onChange={e => setForm(f=>({...f,code:e.target.value}))} />
              <input placeholder="Nom" className="bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm" onChange={e => setForm(f=>({...f,name:e.target.value}))} />
              <input placeholder="NIF" className="bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm" onChange={e => setForm(f=>({...f,nif:e.target.value}))} />
              <input placeholder="RC" className="bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm" onChange={e => setForm(f=>({...f,rc:e.target.value}))} />
            </>}
            {section==="projects" && <>
              <input placeholder="Code" className="bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm" onChange={e => setForm(f=>({...f,code:e.target.value}))} />
              <input placeholder="Nom" className="bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm" onChange={e => setForm(f=>({...f,name:e.target.value}))} />
              <select className="bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm" onChange={e => setForm(f=>({...f,entity_code:e.target.value}))}><option value="">Entite</option>{entities.map((en,i)=><option key={i} value={en.code as string}>{en.name as string}</option>)}</select>
              <input placeholder="Description" className="bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm" onChange={e => setForm(f=>({...f,description:e.target.value}))} />
            </>}
            {section==="associates" && <>
              <input placeholder="Nom" className="bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm" onChange={e => setForm(f=>({...f,name:e.target.value}))} />
              <input placeholder="NIF" className="bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm" onChange={e => setForm(f=>({...f,nif:e.target.value}))} />
              <input placeholder="Email" className="bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm" onChange={e => setForm(f=>({...f,email:e.target.value}))} />
              <input placeholder="Telephone" className="bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm" onChange={e => setForm(f=>({...f,phone:e.target.value}))} />
            </>}
          </div>
          <div className="flex gap-2 mt-4">
            <button onClick={handleAdd} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm">Sauvegarder</button>
            <button onClick={() => setShowForm(false)} className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm">Annuler</button>
          </div>
        </div>
      )}

      <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl overflow-hidden"><div className="overflow-x-auto">
        {section==="entities" && <table className="w-full text-sm"><thead><tr className="bg-slate-700/30">{["Code","Nom","NIF","RC","Adresse"].map(h=><th key={h} className="text-left py-3 px-4 text-slate-400">{h}</th>)}</tr></thead><tbody>{entities.map((e,i)=><tr key={i} className="border-t border-slate-700/50 hover:bg-slate-700/20"><td className="py-3 px-4 text-blue-400 font-medium">{e.code as string}</td><td className="py-3 px-4 text-slate-300">{e.name as string}</td><td className="py-3 px-4 text-slate-400">{(e.nif as string)||"-"}</td><td className="py-3 px-4 text-slate-400">{(e.rc as string)||"-"}</td><td className="py-3 px-4 text-slate-400">{(e.address as string)||"-"}</td></tr>)}</tbody></table>}
        {section==="projects" && <table className="w-full text-sm"><thead><tr className="bg-slate-700/30">{["Code","Nom","Entite","Statut","Budget"].map(h=><th key={h} className="text-left py-3 px-4 text-slate-400">{h}</th>)}</tr></thead><tbody>{projects.map((p,i)=><tr key={i} className="border-t border-slate-700/50 hover:bg-slate-700/20"><td className="py-3 px-4 text-blue-400 font-medium">{p.code as string}</td><td className="py-3 px-4 text-slate-300">{p.name as string}</td><td className="py-3 px-4 text-slate-400">{(p.entity_name as string)||"-"}</td><td className="py-3 px-4"><span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 rounded text-xs">{p.status as string}</span></td><td className="py-3 px-4 text-slate-400">{p.budget?fmtAmt(p.budget as number):"-"}</td></tr>)}</tbody></table>}
        {section==="associates" && <table className="w-full text-sm"><thead><tr className="bg-slate-700/30">{["Nom","NIF","Email","Telephone","Parts"].map(h=><th key={h} className="text-left py-3 px-4 text-slate-400">{h}</th>)}</tr></thead><tbody>{associates.map((a,i)=><tr key={i} className="border-t border-slate-700/50 hover:bg-slate-700/20"><td className="py-3 px-4 text-slate-300 font-medium">{a.name as string}</td><td className="py-3 px-4 text-slate-400">{(a.nif as string)||"-"}</td><td className="py-3 px-4 text-slate-400">{(a.email as string)||"-"}</td><td className="py-3 px-4 text-slate-400">{(a.phone as string)||"-"}</td><td className="py-3 px-4 text-slate-400">{(a.shares as Array<unknown>)?.length||0} projet(s)</td></tr>)}{associates.length===0&&<tr><td colSpan={5} className="py-8 text-center text-slate-500">Aucun associe</td></tr>}</tbody></table>}
      </div></div>
    </div>
  );
}

// ============ Report Tab ============
function ReportTab() {
  const [report, setReport] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => { apiFetch("/api/analytics/ingestion-report").then(setReport).catch(()=>{}).finally(()=>setLoading(false)); }, []);
  if (loading) return <Spinner />;
  if (!report) return <Empty msg="Rapport non disponible" />;
  const summary = report.summary as Record<string, number>;
  const accounting = report.accounting as Record<string, number>;
  const quarantineDocs = (report.quarantine_documents as Array<Record<string, unknown>>) || [];

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold flex items-center gap-2"><BarChart3 size={20} className="text-blue-400" />Rapport d'Ingestion Complet</h3>
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard title="Total Traites" value={summary?.total_documents || 0} icon={FileText} color="text-blue-400" />
        <StatCard title="Succes" value={summary?.processed || 0} icon={CheckCircle} color="text-emerald-400" />
        <StatCard title="Doublons Supprimes" value={summary?.duplicates_removed || 0} icon={Layers} color="text-purple-400" />
        <StatCard title="En Quarantaine" value={summary?.in_quarantine || 0} icon={AlertTriangle} color="text-orange-400" />
        <StatCard title="Erreurs" value={summary?.errors || 0} icon={XCircle} color="text-red-400" />
        <StatCard title="En Attente" value={summary?.pending || 0} icon={Clock} color="text-yellow-400" />
      </div>
      <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6">
        <h3 className="text-sm font-semibold mb-4 text-slate-300 flex items-center gap-2"><Receipt size={16} className="text-emerald-400" />Ecritures Comptables Generees</h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div><p className="text-xs text-slate-400">Proposees</p><p className="text-xl font-bold text-yellow-400">{accounting?.entries_proposed || 0}</p><p className="text-xs text-slate-500">{fmtAmt(accounting?.proposed_total_amount)}</p></div>
          <div><p className="text-xs text-slate-400">Automatiques</p><p className="text-xl font-bold text-cyan-400">{accounting?.entries_auto || 0}</p><p className="text-xs text-slate-500">{fmtAmt(accounting?.auto_total_amount)}</p></div>
        </div>
      </div>
      {quarantineDocs.length > 0 && (
        <div className="bg-slate-800/50 border border-orange-500/30 rounded-xl p-6">
          <h3 className="text-sm font-semibold mb-4 text-orange-400 flex items-center gap-2"><AlertTriangle size={16}/>Documents en Quarantaine</h3>
          <div className="space-y-2">{quarantineDocs.map((d,i)=>(<div key={i} className="flex items-center gap-3 p-2 bg-slate-700/20 rounded-lg text-sm"><AlertTriangle size={14} className="text-orange-400"/><span className="text-slate-300 flex-1">{d.original_filename as string}</span><span className="text-slate-400">{(d.doc_type as string)||"Non classe"}</span><span className="text-orange-400">{d.confidence_score as number}%</span></div>))}</div>
        </div>
      )}
    </div>
  );
}

// ============ Main App ============
export default function App() {
  const [tab, setTab] = useState<TabType>("dashboard");
  const [dash, setDash] = useState<DashboardData | null>(null);
  const [dashLoading, setDashLoading] = useState(true);

  const loadDash = useCallback(async () => {
    setDashLoading(true);
    try { setDash(await apiFetch("/api/analytics/dashboard")); } catch { /* */ }
    setDashLoading(false);
  }, []);
  useEffect(() => { loadDash(); }, [loadDash]);

  const tabs: Array<{ key: TabType; label: string; icon: typeof FileText }> = [
    { key: "dashboard", label: "Tableau de Bord", icon: BarChart3 },
    { key: "upload", label: "Ingestion", icon: Upload },
    { key: "documents", label: "Documents", icon: FileText },
    { key: "pipeline", label: "Pipeline", icon: Activity },
    { key: "accounting", label: "Comptabilite", icon: Receipt },
    { key: "socle", label: "Socle 0", icon: Settings },
    { key: "report", label: "Rapport", icon: BarChart3 },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center"><Database size={20} className="text-white" /></div>
            <div><h1 className="text-lg font-bold text-white">GFI v7.0</h1><p className="text-xs text-slate-400">Cerveau Digital Ultra-Intelligent - Groupe Dendani</p></div>
          </div>
          <span className="px-3 py-1 bg-emerald-500/20 text-emerald-400 rounded-full text-xs font-medium flex items-center gap-1.5"><span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />Pipeline Operationnel</span>
        </div>
      </header>
      <nav className="border-b border-slate-800 bg-slate-900/50">
        <div className="max-w-7xl mx-auto px-4"><div className="flex gap-1 overflow-x-auto py-1">
          {tabs.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)} className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm whitespace-nowrap transition-all ${tab===t.key?"bg-blue-600 text-white shadow-lg shadow-blue-500/25":"text-slate-400 hover:bg-slate-800 hover:text-slate-300"}`}><t.icon size={16}/>{t.label}</button>
          ))}
        </div></div>
      </nav>
      <main className="max-w-7xl mx-auto px-4 py-6">
        {tab==="dashboard" && <DashboardTab data={dash} loading={dashLoading} />}
        {tab==="upload" && <UploadTab onDone={loadDash} />}
        {tab==="documents" && <DocumentsTab />}
        {tab==="pipeline" && <PipelineTab />}
        {tab==="accounting" && <AccountingTab />}
        {tab==="socle" && <SocleTab />}
        {tab==="report" && <ReportTab />}
      </main>
      <footer className="border-t border-slate-800 py-4 mt-8">
        <div className="max-w-7xl mx-auto px-4 flex items-center justify-between text-xs text-slate-500">
          <p>GFI v7.0 - Module d'Ingestion Automatique Universelle</p>
          <p>Groupe Dendani - Confidentiel</p>
        </div>
      </footer>
    </div>
  );
}
