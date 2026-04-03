import { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import {
  LayoutDashboard, Shield, HelpCircle, Building2, FolderKanban,
  FileText, BookOpen, Users, Scale, GitBranch, Settings, Plug,
  LogOut, Menu, X, ChevronDown
} from 'lucide-react';

const NAV_ITEMS = [
  { path: '/', icon: LayoutDashboard, label: 'Tableau de bord' },
  { path: '/audit-objects', icon: Shield, label: 'Objets audités' },
  { path: '/questionnaires', icon: HelpCircle, label: 'Questionnaires' },
  { path: '/companies', icon: Building2, label: 'Sociétés' },
  { path: '/projects', icon: FolderKanban, label: 'Projets' },
  { path: '/documents', icon: FileText, label: 'Documents' },
  { path: '/journal', icon: BookOpen, label: 'Comptabilité' },
  { path: '/hr', icon: Users, label: 'RH / SPI' },
  { path: '/legal', icon: Scale, label: 'Juridique' },
  { path: '/workflows', icon: GitBranch, label: 'Workflows' },
  { path: '/rules', icon: Settings, label: 'Règles métier' },
  { path: '/integrations', icon: Plug, label: 'Intégrations' },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-gray-900 text-white transform transition-transform duration-200
        lg:relative lg:translate-x-0
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="flex items-center justify-between h-16 px-4 border-b border-gray-800">
          <div className="flex items-center gap-2">
            <Shield className="h-7 w-7 text-sentinel-400" />
            <span className="text-lg font-bold">Sentinel</span>
          </div>
          <button className="lg:hidden" onClick={() => setSidebarOpen(false)}>
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map(({ path, icon: Icon, label }) => {
            const active = path === '/' ? location.pathname === '/' : location.pathname.startsWith(path);
            return (
              <Link
                key={path}
                to={path}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  active
                    ? 'bg-sentinel-600 text-white'
                    : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                }`}
              >
                <Icon className="h-5 w-5 flex-shrink-0" />
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-sentinel-600 flex items-center justify-center text-sm font-bold">
              {user?.firstName?.[0]}{user?.lastName?.[0]}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user?.firstName} {user?.lastName}</p>
              <p className="text-xs text-gray-400 truncate">{user?.role}</p>
            </div>
            <button onClick={logout} className="text-gray-400 hover:text-white" title="Déconnexion">
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 bg-white border-b border-gray-200 flex items-center px-4 lg:px-6 gap-4">
          <button className="lg:hidden" onClick={() => setSidebarOpen(true)}>
            <Menu className="h-6 w-6" />
          </button>
          <div className="flex-1" />
          <span className="text-sm text-gray-500">Gouvernance par la preuve</span>
        </header>

        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
