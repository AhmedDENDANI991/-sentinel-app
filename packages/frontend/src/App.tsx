import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import AuditObjectsPage from './pages/AuditObjectsPage';
import AuditObjectDetailPage from './pages/AuditObjectDetailPage';
import QuestionnairesPage from './pages/QuestionnairesPage';
import CompaniesPage from './pages/CompaniesPage';
import ProjectsPage from './pages/ProjectsPage';
import DocumentsPage from './pages/DocumentsPage';
import JournalPage from './pages/JournalPage';
import HRPage from './pages/HRPage';
import LegalPage from './pages/LegalPage';
import WorkflowsPage from './pages/WorkflowsPage';
import RulesPage from './pages/RulesPage';
import IntegrationsPage from './pages/IntegrationsPage';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  if (isLoading) return <div className="flex items-center justify-center h-screen"><div className="animate-spin h-8 w-8 border-4 border-sentinel-600 border-t-transparent rounded-full" /></div>;
  if (!user) return <Navigate to="/login" />;
  return <>{children}</>;
}

export default function App() {
  const { checkAuth } = useAuth();

  useEffect(() => {
    checkAuth();
  }, []);

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route index element={<DashboardPage />} />
        <Route path="audit-objects" element={<AuditObjectsPage />} />
        <Route path="audit-objects/:id" element={<AuditObjectDetailPage />} />
        <Route path="questionnaires" element={<QuestionnairesPage />} />
        <Route path="companies" element={<CompaniesPage />} />
        <Route path="projects" element={<ProjectsPage />} />
        <Route path="documents" element={<DocumentsPage />} />
        <Route path="journal" element={<JournalPage />} />
        <Route path="hr" element={<HRPage />} />
        <Route path="legal" element={<LegalPage />} />
        <Route path="workflows" element={<WorkflowsPage />} />
        <Route path="rules" element={<RulesPage />} />
        <Route path="integrations" element={<IntegrationsPage />} />
      </Route>
    </Routes>
  );
}
