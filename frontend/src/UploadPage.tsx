import React, { useState, useRef } from 'react';

const API = import.meta.env.VITE_API_BASE ?? 'http://localhost:8000';

interface UploadPageProps {
  onComplete: (caseId: string) => void;
}

const UploadPage: React.FC<UploadPageProps> = ({ onComplete }) => {
  const [file,      setFile]      = useState<File | null>(null);
  const [dragOver,  setDragOver]  = useState(false);
  const [loading,   setLoading]   = useState(false);
  const [loadingMsg, setLoadingMsg] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const [meta, setMeta] = useState({
    case_id:         '',
    case_number:     '',
    court_name:      'High Court of Karnataka',
    case_type:       '',
    government_role: 'Respondent',
    filing_date:     '',
    disposal_date:   '',
    department_name: '',
  });

  const set = (key: keyof typeof meta) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setMeta(m => ({ ...m, [key]: e.target.value }));

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f?.type === 'application/pdf') setFile(f);
  };

  const handleSubmit = async () => {
    if (!file || !meta.case_id) return;

    const form = new FormData();
    form.append('file', file);
    form.append('metadata', JSON.stringify(meta));

    setLoading(true);
    setLoadingMsg('Uploading judgment…');

    try {
      setLoadingMsg('Analysing judgment with AI — this takes 30–60 s…');
      const res  = await fetch(`${API}/cases/upload`, { method: 'POST', body: form });
      const data = await res.json();
      if (data.case_id) {
        onComplete(data.case_id);
      } else {
        alert('Upload failed: ' + (data.detail ?? 'Unknown error'));
      }
    } catch {
      alert('Network error — is the backend running?');
    } finally {
      setLoading(false);
    }
  };

  const canSubmit = !!file && !!meta.case_id && !loading;

  return (
    <>
      {loading && (
        <div className="loading-overlay">
          <div className="spinner" />
          <div className="loading-text">{loadingMsg}</div>
          <div className="loading-sub">Do not close this tab</div>
        </div>
      )}

      <div className="page">
        <h1 className="page-title">Upload Judgment</h1>
        <p className="page-sub">
          Drop a Karnataka High Court order PDF — AI will extract directions and build a compliance action plan.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, alignItems: 'start' }}>

          {/* Drop zone */}
          <div>
            <label
              className={`upload-zone${dragOver ? ' drag-over' : ''}${file ? ' has-file' : ''}`}
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileRef.current?.click()}
            >
              <div className="upload-icon">{file ? '✅' : '📄'}</div>
              <h3>{file ? file.name : 'Drop judgment PDF here'}</h3>
              <p>
                {file
                  ? `${(file.size / 1024).toFixed(0)} KB · click to replace`
                  : 'or click to browse · PDF only'}
              </p>
              <input
                ref={fileRef}
                type="file"
                accept="application/pdf"
                onChange={e => { const f = e.target.files?.[0]; if (f) setFile(f); }}
              />
            </label>
          </div>

          {/* Metadata form */}
          <div className="card card-pad">
            <div className="form-grid">
              <div className="form-group">
                <label htmlFor="u_case_id">Case ID *</label>
                <input id="u_case_id" type="text" placeholder="e.g. WP-1234-2024"
                  value={meta.case_id} onChange={set('case_id')} />
              </div>
              <div className="form-group">
                <label htmlFor="u_case_num">Case Number</label>
                <input id="u_case_num" type="text" placeholder="CCMS case number"
                  value={meta.case_number} onChange={set('case_number')} />
              </div>
              <div className="form-group">
                <label htmlFor="u_court">Court Name</label>
                <input id="u_court" type="text"
                  value={meta.court_name} onChange={set('court_name')} />
              </div>
              <div className="form-group">
                <label htmlFor="u_type">Case Type</label>
                <input id="u_type" type="text" placeholder="e.g. Writ Petition"
                  value={meta.case_type} onChange={set('case_type')} />
              </div>
              <div className="form-group">
                <label htmlFor="u_role">Government Role</label>
                <select id="u_role" value={meta.government_role} onChange={set('government_role')}>
                  <option>Respondent</option>
                  <option>Petitioner</option>
                </select>
              </div>
              <div className="form-group">
                <label htmlFor="u_dept">Department</label>
                <input id="u_dept" type="text" placeholder="Responsible department"
                  value={meta.department_name} onChange={set('department_name')} />
              </div>
              <div className="form-group">
                <label htmlFor="u_filing">Filing Date</label>
                <input id="u_filing" type="date"
                  value={meta.filing_date} onChange={set('filing_date')} />
              </div>
              <div className="form-group">
                <label htmlFor="u_disposal">Disposal Date</label>
                <input id="u_disposal" type="date"
                  value={meta.disposal_date} onChange={set('disposal_date')} />
              </div>
            </div>

            <div style={{ marginTop: 20 }}>
              <button className="btn btn-primary btn-full" onClick={handleSubmit} disabled={!canSubmit}>
                Analyse Judgment
              </button>
            </div>
          </div>

        </div>
      </div>
    </>
  );
};

export default UploadPage;
