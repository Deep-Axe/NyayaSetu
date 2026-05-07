import React, { useState } from 'react';

const API = import.meta.env.VITE_API_BASE ?? 'http://localhost:8000';

interface ActionTrackerProps {
  caseId: string;
}

const ActionTracker: React.FC<ActionTrackerProps> = ({ caseId }) => {
  const [open,            setOpen]            = useState(false);
  const [actionType,      setActionType]      = useState('Complied');
  const [actionDate,      setActionDate]      = useState('');
  const [referenceNumber, setReferenceNumber] = useState('');

  const handleSave = () => {
    fetch(`${API}/cases/${encodeURIComponent(caseId)}/actions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action_type: actionType, action_date: actionDate, reference_number: referenceNumber }),
    })
      .then(r => r.json())
      .then(() => { alert('Action recorded!'); setOpen(false); })
      .catch(console.error);
  };

  return (
    <>
      <button className="btn btn-success" style={{ padding: '4px 10px', fontSize: 11 }} onClick={() => setOpen(true)}>
        Record Action
      </button>

      {open && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,.4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 300,
        }}>
          <div className="card card-pad" style={{ width: 360 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--navy)', marginBottom: 16 }}>
              Record Compliance Action
            </h2>
            <div className="form-grid" style={{ gridTemplateColumns: '1fr' }}>
              <div className="form-group">
                <label htmlFor="at_type">Action Type</label>
                <select id="at_type" value={actionType} onChange={e => setActionType(e.target.value)}>
                  <option>Complied</option>
                  <option>Appeal Filed</option>
                  <option>Stay Obtained</option>
                </select>
              </div>
              <div className="form-group">
                <label htmlFor="at_date">Date of Action</label>
                <input id="at_date" type="date" value={actionDate} onChange={e => setActionDate(e.target.value)} />
              </div>
              <div className="form-group">
                <label htmlFor="at_ref">Reference Number</label>
                <input id="at_ref" type="text" placeholder="e.g. Appeal Filing #"
                  value={referenceNumber} onChange={e => setReferenceNumber(e.target.value)} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
              <button className="btn btn-outline" style={{ flex: 1 }} onClick={() => setOpen(false)}>Cancel</button>
              <button className="btn btn-success" style={{ flex: 1 }} onClick={handleSave}>Save Record</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ActionTracker;
