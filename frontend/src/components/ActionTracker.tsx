import React, { useState } from 'react';

interface ActionTrackerProps {
  caseId: string;
}

const ActionTracker: React.FC<ActionTrackerProps> = ({ caseId }) => {
  const [showModal, setShowModal] = useState(false);
  const [actionType, setActionType] = useState('Complied');
  const [actionDate, setActionDate] = useState('');
  const [referenceNumber, setReferenceNumber] = useState('');
  
  const handleSave = () => {
    fetch(`${import.meta.env.VITE_API_BASE ?? 'http://localhost:8000'}/cases/${encodeURIComponent(caseId)}/actions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action_type: actionType, action_date: actionDate, reference_number: referenceNumber })
    }).then(res => res.json())
      .then(() => {
        alert('Action Recorded!');
        setShowModal(false);
      });
  };

  return (
    <div style={{ padding: '10px' }}>
      <button onClick={() => setShowModal(true)} style={{ backgroundColor: '#38a169', color: 'white', padding: '10px 20px', borderRadius: '4px' }}>
        Record Compliance Action
      </button>
      
      {showModal && (
        <div className="modal" style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', backgroundColor: 'white', padding: '30px', boxShadow: '0 0 20px rgba(0,0,0,0.2)', borderRadius: '8px' }}>
          <h2>Record Action</h2>
          <label>Action Type:</label>
          <select value={actionType} onChange={e => setActionType(e.target.value)} style={{ width: '100%', marginBottom: '10px' }}>
            <option>Complied</option>
            <option>Appeal Filed</option>
            <option>Stay Obtained</option>
          </select>
          <label>Date of Action:</label>
          <input type="date" value={actionDate} onChange={e => setActionDate(e.target.value)} style={{ width: '100%', marginBottom: '10px' }} />
          <label>Reference Number:</label>
          <input type="text" value={referenceNumber} onChange={e => setReferenceNumber(e.target.value)} placeholder="e.g. Appeal Filing #" style={{ width: '100%', marginBottom: '20px' }} />
          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={() => setShowModal(false)} style={{ flex: 1 }}>Cancel</button>
            <button onClick={handleSave} style={{ flex: 1, backgroundColor: '#38a169', color: 'white' }}>Save Record</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ActionTracker;
