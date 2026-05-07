import React, { useState, useEffect } from 'react';
import PDFViewer from './components/PDFViewer';

const API = import.meta.env.VITE_API_BASE ?? 'http://localhost:8000';

interface VerificationPageProps {
  caseId: string | null;
}

const CONF_BADGE: Record<string, string> = {
  high:   'badge-green',
  medium: 'badge-amber',
  low:    'badge-red',
};

const VerificationPage: React.FC<VerificationPageProps> = ({ caseId }) => {
  const [caseData,   setCaseData]   = useState<any>(null);
  const [editingId,  setEditingId]  = useState<string | null>(null);
  const [editText,   setEditText]   = useState('');
  const [busy,       setBusy]       = useState(false);

  const activeCaseId = caseId ?? '';

  const refreshCase = () =>
    fetch(`${API}/cases/${encodeURIComponent(activeCaseId)}`)
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then(setCaseData)
      .catch(console.error);

  useEffect(() => {
    if (activeCaseId) refreshCase();
    else setCaseData(null);
  }, [activeCaseId]);

  const handleAction = async (dirId: string, action: string, newValue: string | null = null) => {
    setBusy(true);
    await fetch(`${API}/cases/${encodeURIComponent(activeCaseId)}/directions/${dirId}/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, field_name: 'text', new_value: newValue }),
    }).catch(console.error);
    await refreshCase();
    setBusy(false);
  };

  const handleSaveEdit = async (dirId: string) => {
    await handleAction(dirId, 'edited', editText);
    setEditingId(null);
  };

  const handleSubmit = async () => {
    setBusy(true);
    await fetch(`${API}/cases/${encodeURIComponent(activeCaseId)}/state?state=VERIFIED`, {
      method: 'PATCH',
    }).catch(console.error);
    await refreshCase();
    setBusy(false);
  };

  if (!activeCaseId) {
    return (
      <div className="verify-layout">
        <div className="empty-verify" style={{ flex: 1 }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round"
              d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
          </svg>
          <p>Select a case from the Dashboard to review it here.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="verify-layout">
      <div className="verify-pdf">
        <PDFViewer
          pdfUrl={`${API}/cases/${encodeURIComponent(activeCaseId)}/pdf`}
          highlights={[]}
        />
      </div>

      <div className="verify-panel">
        <div className="verify-header">
          <h1>Review Action Plan</h1>
          <p>{activeCaseId}</p>
        </div>

        {!caseData && <p style={{ color: 'var(--gray-400)' }}>Loading…</p>}

        {caseData?.directions?.map((d: any) => {
          const confidence = d.extracted_json?.confidence ?? 'medium';
          return (
            <div key={d.direction_id} className="direction-card">
              <h3>Direction {d.direction_id}</h3>
              <span
                className={`badge ${CONF_BADGE[confidence] || 'badge-gray'}`}
                style={{ marginBottom: 10, display: 'inline-block' }}
              >
                {confidence} confidence
              </span>

              {editingId === d.direction_id ? (
                <>
                  <textarea
                    value={editText}
                    onChange={e => setEditText(e.target.value)}
                    style={{ width: '100%', minHeight: 80, marginBottom: 10, resize: 'vertical' }}
                  />
                  <div className="direction-actions">
                    <button className="btn btn-primary" style={{ flex: 1 }}
                      onClick={() => handleSaveEdit(d.direction_id)} disabled={busy}>
                      Save Edit
                    </button>
                    <button className="btn btn-outline" style={{ flex: 1 }}
                      onClick={() => setEditingId(null)}>
                      Cancel
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <p>{d.extracted_json?.text || 'No text available'}</p>
                  <div className="direction-actions">
                    <button className="btn btn-success" style={{ flex: 1 }}
                      onClick={() => handleAction(d.direction_id, 'approved')} disabled={busy}>
                      Approve
                    </button>
                    <button className="btn btn-outline" style={{ flex: 1 }}
                      onClick={() => { setEditingId(d.direction_id); setEditText(d.extracted_json?.text ?? ''); }}>
                      Edit
                    </button>
                    <button className="btn btn-danger" style={{ flex: 1 }}
                      onClick={() => handleAction(d.direction_id, 'rejected')} disabled={busy}>
                      Reject
                    </button>
                  </div>
                </>
              )}
            </div>
          );
        })}

        {caseData && (
          <button className="btn btn-primary btn-full" onClick={handleSubmit} disabled={busy}>
            Submit Verified Action Plan
          </button>
        )}
      </div>
    </div>
  );
};

export default VerificationPage;
