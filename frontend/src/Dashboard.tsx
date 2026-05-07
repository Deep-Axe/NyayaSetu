import React, { useState, useEffect } from 'react';
import ActionTracker from './components/ActionTracker';

const API = import.meta.env.VITE_API_BASE ?? 'http://localhost:8000';

interface DashboardProps {
  onSelectCase: (caseId: string) => void;
}

const STATE_BADGE: Record<string, string> = {
  UPLOADED:  'badge-blue',
  EXTRACTED: 'badge-amber',
  VERIFIED:  'badge-green',
  PENDING:   'badge-gray',
};

const Dashboard: React.FC<DashboardProps> = ({ onSelectCase }) => {
  const [tab, setTab]     = useState<'week' | 'month' | 'risk'>('week');
  const [cases, setCases] = useState<any[]>([]);
  const [stats, setStats] = useState({ week: 0, month: 0, risk: 0 });

  useEffect(() => {
    Promise.all([
      fetch(`${API}/dashboard/weekly`).then(r => r.json()),
      fetch(`${API}/dashboard/monthly`).then(r => r.json()),
      fetch(`${API}/dashboard/contempt-risk`).then(r => r.json()),
    ]).then(([w, m, r]) => setStats({
      week:  Array.isArray(w) ? w.length : 0,
      month: Array.isArray(m) ? m.length : 0,
      risk:  Array.isArray(r) ? r.length : 0,
    })).catch(() => {});
  }, []);

  useEffect(() => {
    const ep = tab === 'risk' ? '/dashboard/contempt-risk'
             : tab === 'month' ? '/dashboard/monthly'
             : '/dashboard/weekly';
    fetch(`${API}${ep}`)
      .then(r => r.json())
      .then(d => setCases(Array.isArray(d) ? d : []))
      .catch(console.error);
  }, [tab]);

  return (
    <div className="page">
      <h1 className="page-title">Compliance Dashboard</h1>
      <p className="page-sub">Karnataka High Court — Judgment Monitoring</p>

      <div className="stats-row">
        <div className="stat-card week">
          <div className="stat-label">Due This Week</div>
          <div className="stat-value">{stats.week}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Due This Month</div>
          <div className="stat-value">{stats.month}</div>
        </div>
        <div className="stat-card risk">
          <div className="stat-label">Contempt Risk</div>
          <div className="stat-value">{stats.risk}</div>
        </div>
      </div>

      <div className="card">
        <div className="card-pad">
          <div className="tabs">
            <button className={`tab${tab === 'week'  ? ' active' : ''}`} onClick={() => setTab('week')}>Due This Week</button>
            <button className={`tab${tab === 'month' ? ' active' : ''}`} onClick={() => setTab('month')}>Due This Month</button>
            <button className={`tab risk-tab${tab === 'risk' ? ' active' : ''}`} onClick={() => setTab('risk')}>Contempt Risk Register</button>
          </div>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Case ID</th>
                  <th>Case Number</th>
                  <th>Department</th>
                  <th>Deadline</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {cases.length === 0 && (
                  <tr className="empty-row"><td colSpan={6}>No cases found for this view</td></tr>
                )}
                {cases.map((c: any) => (
                  <tr key={c.id}>
                    <td>
                      <button className="case-link" onClick={() => onSelectCase(c.case_id)}>
                        {c.case_id}
                      </button>
                    </td>
                    <td>{c.ccms_metadata?.case_number || '—'}</td>
                    <td>{c.ccms_metadata?.department_name || '—'}</td>
                    <td>{c.deadline || '—'}</td>
                    <td>
                      <span className={`badge ${STATE_BADGE[c.lifecycle_state] || 'badge-gray'}`}>
                        {c.lifecycle_state}
                      </span>
                    </td>
                    <td>
                      {c.lifecycle_state === 'VERIFIED' && <ActionTracker caseId={c.case_id} />}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
