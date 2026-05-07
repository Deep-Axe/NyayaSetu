import React, { useState, useEffect } from 'react';
import PDFViewer from './components/PDFViewer';

const API = import.meta.env.VITE_API_BASE ?? 'http://localhost:8000';

interface VerificationPageProps {
  caseId: string | null;
}

const VerificationPage: React.FC<VerificationPageProps> = ({ caseId }) => {
  const [caseData, setCaseData] = useState<any>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');

  const activeCaseId = caseId ?? '';

  useEffect(() => {
    if (!activeCaseId) return;
    fetch(`${API}/cases/${encodeURIComponent(activeCaseId)}`)
      .then(res => res.json())
      .then(data => setCaseData(data))
      .catch(err => console.error(err));
  }, [activeCaseId]);

  const handleAction = (directionId: string, action: string, newValue: string | null = null) => {
    fetch(`${API}/cases/${encodeURIComponent(activeCaseId)}/directions/${directionId}/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, field_name: 'text', new_value: newValue }),
    })
      .then(res => res.json())
      .then(() => alert(`${action} recorded!`));
  };

  const handleSaveEdit = (directionId: string) => {
    handleAction(directionId, 'edited', editText);
    setEditingId(null);
  };

  const handleSubmit = () => {
    fetch(`${API}/cases/${encodeURIComponent(activeCaseId)}/state?state=VERIFIED`, {
      method: 'PATCH',
    }).then(() => alert('Action Plan Verified!'));
  };

  if (!activeCaseId) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: '#888' }}>
        <p>Select a case from the Dashboard to review it here.</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', height: '100vh' }}>
      <div style={{ flex: 1, borderRight: '1px solid #ccc' }}>
        <PDFViewer pdfUrl={`${API}/cases/${encodeURIComponent(activeCaseId)}/pdf`} highlights={[]} />
      </div>

      <div style={{ flex: 1, padding: '20px', overflowY: 'auto' }}>
        <h1 style={{ fontSize: '1.2rem', marginBottom: '4px' }}>Review Action Plan</h1>
        <p style={{ color: '#666', marginBottom: '20px', fontSize: '0.9rem' }}>{activeCaseId}</p>

        {caseData && caseData.directions ? caseData.directions.map((d: any) => (
          <div key={d.direction_id} style={{ border: '1px solid #ddd', padding: '15px', marginBottom: '15px', borderRadius: '6px' }}>
            <h3 style={{ margin: '0 0 8px', fontSize: '0.95rem', color: '#1a365d' }}>Direction {d.direction_id}</h3>

            {editingId === d.direction_id ? (
              <div>
                <textarea
                  value={editText}
                  onChange={e => setEditText(e.target.value)}
                  style={{ width: '100%', minHeight: '80px', padding: '8px', marginBottom: '8px', borderRadius: '4px', border: '1px solid #ccc', resize: 'vertical' }}
                />
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => handleSaveEdit(d.direction_id)}
                    style={{ flex: 1, padding: '6px', backgroundColor: '#3182ce', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                  >
                    Save Edit
                  </button>
                  <button
                    onClick={() => setEditingId(null)}
                    style={{ flex: 1, padding: '6px', border: '1px solid #ccc', borderRadius: '4px', cursor: 'pointer' }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <>
                <p style={{ margin: '0 0 12px', color: '#333' }}>{d.extracted_json?.text || 'No text available'}</p>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => handleAction(d.direction_id, 'approved')}
                    style={{ flex: 1, padding: '6px', backgroundColor: '#e6fffa', color: '#234e52', border: '1px solid #81e6d9', borderRadius: '4px', cursor: 'pointer' }}
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => { setEditingId(d.direction_id); setEditText(d.extracted_json?.text ?? ''); }}
                    style={{ flex: 1, padding: '6px', border: '1px solid #ccc', borderRadius: '4px', cursor: 'pointer' }}
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleAction(d.direction_id, 'rejected')}
                    style={{ flex: 1, padding: '6px', color: 'red', border: '1px solid #feb2b2', borderRadius: '4px', cursor: 'pointer' }}
                  >
                    Reject
                  </button>
                </div>
              </>
            )}
          </div>
        )) : (
          <p style={{ color: '#888' }}>Loading case data…</p>
        )}

        <button
          onClick={handleSubmit}
          style={{ width: '100%', padding: '12px', backgroundColor: '#3182ce', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
        >
          Submit Verified Action Plan
        </button>
      </div>
    </div>
  );
};

export default VerificationPage;
