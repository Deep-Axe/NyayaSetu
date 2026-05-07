import React, { useState, useEffect } from 'react';
import ActionTracker from './components/ActionTracker';

const API = import.meta.env.VITE_API_BASE ?? 'http://localhost:8000';

interface DashboardProps {
  onSelectCase: (caseId: string) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ onSelectCase }) => {
  const [tab, setTab] = useState<'week' | 'month' | 'risk'>('week');
  const [cases, setCases] = useState<any[]>([]);

  useEffect(() => {
    const endpoint =
      tab === 'risk' ? '/dashboard/contempt-risk' :
      tab === 'month' ? '/dashboard/monthly' :
      '/dashboard/weekly';

    fetch(`${API}${endpoint}`)
      .then(res => res.json())
      .then(data => setCases(Array.isArray(data) ? data : []))
      .catch(err => console.error(err));
  }, [tab]);

  return (
    <div style={{ padding: '20px' }}>
      <h1>NyayaSetu Dashboard</h1>
      <div style={{ display: 'flex', gap: '20px', marginBottom: '20px' }}>
        <button onClick={() => setTab('week')} style={{ borderBottom: tab === 'week' ? '2px solid #3182ce' : 'none', background: 'none', cursor: 'pointer', padding: '8px 0' }}>This Week</button>
        <button onClick={() => setTab('month')} style={{ borderBottom: tab === 'month' ? '2px solid #3182ce' : 'none', background: 'none', cursor: 'pointer', padding: '8px 0' }}>This Month</button>
        <button onClick={() => setTab('risk')} style={{ color: 'red', borderBottom: tab === 'risk' ? '2px solid red' : 'none', background: 'none', cursor: 'pointer', padding: '8px 0' }}>Contempt Risk Register</button>
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '20px' }}>
        <thead>
          <tr style={{ textAlign: 'left', borderBottom: '2px solid #eee' }}>
            <th style={{ padding: '8px' }}>Case Number</th>
            <th style={{ padding: '8px' }}>Department</th>
            <th style={{ padding: '8px' }}>Deadline</th>
            <th style={{ padding: '8px' }}>State</th>
            <th style={{ padding: '8px' }}>Action</th>
          </tr>
        </thead>
        <tbody>
          {cases.length === 0 && (
            <tr><td colSpan={5} style={{ padding: '20px', textAlign: 'center', color: '#888' }}>No cases found</td></tr>
          )}
          {cases.map((c: any) => (
            <tr key={c.id} style={{ borderBottom: '1px solid #eee' }}>
              <td style={{ padding: '8px' }}>
                <button
                  onClick={() => onSelectCase(c.case_id)}
                  style={{ background: 'none', border: 'none', color: '#3182ce', cursor: 'pointer', textDecoration: 'underline', padding: 0 }}
                >
                  {c.case_id}
                </button>
              </td>
              <td style={{ padding: '8px' }}>{c.ccms_metadata?.department_name || 'N/A'}</td>
              <td style={{ padding: '8px' }}>{c.deadline || '—'}</td>
              <td style={{ padding: '8px' }}>{c.lifecycle_state}</td>
              <td style={{ padding: '8px' }}>
                {c.lifecycle_state === 'VERIFIED' && <ActionTracker caseId={c.case_id} />}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default Dashboard;
