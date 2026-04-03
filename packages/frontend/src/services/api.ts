const API_BASE = '/api';

class ApiClient {
  private token: string | null = null;

  setToken(token: string | null) {
    this.token = token;
    if (token) localStorage.setItem('sentinel_token', token);
    else localStorage.removeItem('sentinel_token');
  }

  getToken(): string | null {
    if (!this.token) this.token = localStorage.getItem('sentinel_token');
    return this.token;
  }

  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const token = this.getToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };

    const res = await fetch(`${API_BASE}${path}`, { ...options, headers });

    if (res.status === 401) {
      this.setToken(null);
      window.location.href = '/login';
      throw new Error('Unauthorized');
    }

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Request failed' }));
      throw new Error(err.error || `HTTP ${res.status}`);
    }

    return res.json();
  }

  // Auth
  login(email: string, password: string) {
    return this.request<{ user: any; token: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  getMe() {
    return this.request<any>('/auth/me');
  }

  // Dashboard
  getKPIs() {
    return this.request<any>('/dashboard/kpis');
  }

  getQueues() {
    return this.request<any>('/dashboard/queues');
  }

  getStateDistribution() {
    return this.request<any[]>('/dashboard/state-distribution');
  }

  getActivity() {
    return this.request<any[]>('/dashboard/activity');
  }

  // Companies
  getCompanies(params = '') {
    return this.request<any>(`/companies${params ? '?' + params : ''}`);
  }

  getCompany(id: string) {
    return this.request<any>(`/companies/${id}`);
  }

  createCompany(data: any) {
    return this.request<any>('/companies', { method: 'POST', body: JSON.stringify(data) });
  }

  // Projects
  getProjects(params = '') {
    return this.request<any>(`/projects${params ? '?' + params : ''}`);
  }

  // Audit Objects
  getAuditObjects(params = '') {
    return this.request<any>(`/audit-objects${params ? '?' + params : ''}`);
  }

  getAuditObject(id: string) {
    return this.request<any>(`/audit-objects/${id}`);
  }

  transitionState(id: string, data: { toState: string; reason?: string; actorType?: string }) {
    return this.request<any>(`/audit-objects/${id}/transition`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Questionnaires
  getQuestionnaires(params = '') {
    return this.request<any>(`/questionnaires${params ? '?' + params : ''}`);
  }

  answerQuestionnaire(id: string, data: { response: string; responseType: string }) {
    return this.request<any>(`/questionnaires/${id}/answer`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Documents
  getDocuments(params = '') {
    return this.request<any>(`/documents${params ? '?' + params : ''}`);
  }

  // Journal
  getJournalEntries(params = '') {
    return this.request<any>(`/journal${params ? '?' + params : ''}`);
  }

  getJournalAnomalies(companyId?: string) {
    return this.request<any>(`/journal/anomalies${companyId ? '?companyId=' + companyId : ''}`);
  }

  // HR
  getEmployees(params = '') {
    return this.request<any>(`/hr/employees${params ? '?' + params : ''}`);
  }

  getTasks(params = '') {
    return this.request<any>(`/hr/tasks${params ? '?' + params : ''}`);
  }

  // Stock
  getStockLevels(locationId?: string) {
    return this.request<any>(`/stock/levels${locationId ? '?locationId=' + locationId : ''}`);
  }

  getStockAlerts() {
    return this.request<any[]>('/stock/alerts');
  }

  // Legal
  getLegalDeadlines() {
    return this.request<any[]>('/legal/deadlines');
  }

  // Workflows
  getWorkflows(params = '') {
    return this.request<any>(`/workflows${params ? '?' + params : ''}`);
  }

  // Rules
  getRules(params = '') {
    return this.request<any>(`/rules${params ? '?' + params : ''}`);
  }

  // Integrations
  getIntegrationHealth() {
    return this.request<any>('/integrations/health');
  }

  // Proof
  getProofChain(auditObjectId: string) {
    return this.request<any[]>(`/proof/chain/${auditObjectId}`);
  }

  verifyProof(proofId: string) {
    return this.request<any>(`/proof/verify/${proofId}`);
  }
}

export const api = new ApiClient();
