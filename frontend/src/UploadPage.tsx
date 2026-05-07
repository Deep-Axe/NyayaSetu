import React, { useState, useRef } from 'react';
import { pdfjs } from 'react-pdf';

pdfjs.GlobalWorkerOptions.workerSrc =
  `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

const API    = import.meta.env.VITE_API_BASE ?? 'http://localhost:8000';
const MAX_MB = 20;

interface UploadPageProps {
  onComplete: (caseId: string) => void;
}

/* ── Karnataka HC judgment text parser ─────────────────────────────────── */
const MONTHS: Record<string, string> = {
  JANUARY: '01', FEBRUARY: '02', MARCH: '03',    APRIL:    '04',
  MAY:     '05', JUNE:     '06', JULY:  '07',    AUGUST:   '08',
  SEPTEMBER:'09',OCTOBER:  '10', NOVEMBER: '11', DECEMBER: '12',
};

const CASE_TYPE_PREFIXES: [RegExp, string][] = [
  [/WRIT PETITION \(CIVIL\)/i,           'Writ Petition (Civil)'],
  [/WRIT PETITION \(PIL\)/i,             'Writ Petition (PIL)'],
  [/WRIT PETITION/i,                     'Writ Petition'],
  [/\bW\.P\.\b/i,                        'Writ Petition'],
  [/WRIT APPEAL/i,                       'Writ Appeal'],
  [/\bW\.A\.\b/i,                        'Writ Appeal'],
  [/MISCELLANEOUS FIRST APPEAL/i,        'Miscellaneous First Appeal'],
  [/\bM\.F\.A\.\b/i,                     'Miscellaneous First Appeal'],
  [/CRIMINAL PETITION/i,                 'Criminal Petition'],
  [/\bCRL\.P\.\b/i,                      'Criminal Petition'],
  [/REGULAR FIRST APPEAL/i,              'Regular First Appeal'],
  [/\bR\.F\.A\.\b/i,                     'Regular First Appeal'],
  [/PUBLIC INTEREST LITIGATION/i,        'Public Interest Litigation'],
  [/\bPIL\b/i,                           'Public Interest Litigation'],
];

async function parsePdfMetadata(file: File): Promise<{
  court_name?: string;
  case_number?: string;
  case_type?: string;
  disposal_date?: string;
}> {
  const buf  = await file.arrayBuffer();
  const doc  = await pdfjs.getDocument({ data: buf }).promise;
  let   text = '';
  for (let p = 1; p <= Math.min(doc.numPages, 3); p++) {
    const page    = await doc.getPage(p);
    const content = await page.getTextContent();
    text += (content.items as any[]).map(i => i.str).join(' ') + '\n';
  }

  const result: Record<string, string> = {};

  // Court name
  if (/HIGH COURT OF KARNATAKA/i.test(text))
    result.court_name = 'High Court of Karnataka';

  // Case number — e.g. "WRIT PETITION NO. 12345 OF 2024" or "W.P. NO.12345/2024"
  const caseMatch = text.match(
    /(WRIT\s+PETITION(?:\s+\([^)]+\))?|WRIT\s+APPEAL|MISCELLANEOUS\s+FIRST\s+APPEAL|M\.F\.A\.|CRIMINAL\s+PETITION|CRL\.P\.|REGULAR\s+FIRST\s+APPEAL|R\.F\.A\.|PUBLIC\s+INTEREST\s+LITIGATION|W\.P\.|W\.A\.|PIL)\s+NO\.?\s*(\d+)\s*(?:OF|\/)\s*(\d{4})/i
  );
  if (caseMatch) {
    const prefix = caseMatch[1].replace(/\s+/g, ' ').trim();
    result.case_number = `${prefix} No. ${caseMatch[2]}/${caseMatch[3]}`;
    for (const [re, label] of CASE_TYPE_PREFIXES) {
      if (re.test(prefix)) { result.case_type = label; break; }
    }
  }

  // Order date — "DATED THIS THE 5TH DAY OF APRIL, 2024"
  const dated = text.match(
    /DATED\s+THIS\s+THE\s+(\d+)\w*\s+DAY\s+OF\s+([A-Z]+),?\s+(\d{4})/i
  );
  if (dated) {
    const d = dated[1].padStart(2, '0');
    const m = MONTHS[dated[2].toUpperCase()] ?? '01';
    result.disposal_date = `${dated[3]}-${m}-${d}`;
  } else {
    // Fallback: DD.MM.YYYY or DD/MM/YYYY
    const shortDate = text.match(/(\d{2})[./](\d{2})[./](\d{4})/);
    if (shortDate)
      result.disposal_date = `${shortDate[3]}-${shortDate[2]}-${shortDate[1]}`;
  }

  return result;
}

/* ── Icons ──────────────────────────────────────────────────────────────── */
const IconDoc = () => (
  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"
    style={{ margin: '0 auto 12px', display: 'block', color: 'var(--blue)' }}>
    <path strokeLinecap="round" strokeLinejoin="round"
      d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
  </svg>
);

const IconCheck = () => (
  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"
    style={{ margin: '0 auto 12px', display: 'block', color: 'var(--green)' }}>
    <path strokeLinecap="round" strokeLinejoin="round"
      d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
  </svg>
);

/* ── Component ──────────────────────────────────────────────────────────── */
type Meta = {
  case_id: string;
  case_number: string;
  court_name: string;
  case_type: string;
  government_role: string;
  disposal_date: string;
  department_name: string;
};

const BLANK: Meta = {
  case_id:         '',
  case_number:     '',
  court_name:      'High Court of Karnataka',
  case_type:       '',
  government_role: 'Respondent',
  disposal_date:   '',
  department_name: '',
};

const UploadPage: React.FC<UploadPageProps> = ({ onComplete }) => {
  const [file,       setFile]       = useState<File | null>(null);
  const [parsing,    setParsing]    = useState(false);
  const [dragOver,   setDragOver]   = useState(false);
  const [loading,    setLoading]    = useState(false);
  const [loadingMsg, setLoadingMsg] = useState('');
  const [error,      setError]      = useState('');
  const [meta,       setMeta]       = useState<Meta>(BLANK);
  const fileRef = useRef<HTMLInputElement>(null);

  const set = (key: keyof Meta) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setMeta(m => ({ ...m, [key]: e.target.value }));

  const acceptFile = async (f: File) => {
    setError('');
    if (f.type !== 'application/pdf') { setError('Only PDF files are accepted.'); return; }
    if (f.size > MAX_MB * 1024 * 1024) { setError(`File exceeds ${MAX_MB} MB limit.`); return; }
    setFile(f);

    // Auto-parse metadata from the PDF (court name, case number, order date)
    setParsing(true);
    try {
      const parsed = await parsePdfMetadata(f);
      setMeta(m => ({
        ...m,
        court_name:   parsed.court_name   ?? m.court_name,
        case_number:  parsed.case_number  ?? m.case_number,
        case_type:    parsed.case_type    ?? m.case_type,
        disposal_date: parsed.disposal_date ?? m.disposal_date,
        // department_name and government_role intentionally NOT auto-filled
        // (officer must explicitly select which department is responsible)
      }));
    } catch { /* parsing failure is non-fatal — fields stay editable */ }
    finally { setParsing(false); }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) acceptFile(f);
  };

  const handleSubmit = async () => {
    if (!file || !meta.case_id) return;
    setError('');

    // Duplicate case_id check
    try {
      const chk = await fetch(`${API}/cases/${encodeURIComponent(meta.case_id)}`);
      if (chk.ok) { setError(`Case ID "${meta.case_id}" already exists.`); return; }
    } catch { /* backend unreachable — proceed */ }

    const form = new FormData();
    form.append('pdf', file);
    form.append('metadata', JSON.stringify(meta));

    setLoading(true);
    setLoadingMsg('Uploading judgment…');
    try {
      setLoadingMsg('Analysing with AI — this takes 30–60 s…');
      const res  = await fetch(`${API}/cases/upload`, { method: 'POST', body: form });
      const data = await res.json();
      if (data.case_id) {
        onComplete(data.case_id);
      } else {
        setError('Upload failed: ' + (data.detail ?? 'Unknown error'));
      }
    } catch {
      setError('Network error — is the backend running?');
    } finally {
      setLoading(false);
    }
  };

  const canSubmit = !!file && !!meta.case_id && !loading && !parsing;

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
          Drop a Karnataka High Court order PDF — court details are parsed automatically, you only need to fill in your department context.
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
              {file ? <IconCheck /> : <IconDoc />}
              <h3>{file ? file.name : 'Drop judgment PDF here'}</h3>
              <p>
                {parsing
                  ? 'Reading court details from PDF…'
                  : file
                    ? `${(file.size / 1024).toFixed(0)} KB · click to replace`
                    : `or click to browse · PDF only · max ${MAX_MB} MB`}
              </p>
              <input
                ref={fileRef}
                type="file"
                accept="application/pdf"
                onChange={e => { const f = e.target.files?.[0]; if (f) acceptFile(f); }}
              />
            </label>
          </div>

          {/* Metadata form */}
          <div className="card card-pad">
            <div className="form-grid">

              {/* ── Auto-filled from PDF (editable) ── */}
              <div className="form-group">
                <label htmlFor="u_court">Court Name</label>
                <input id="u_court" type="text" value={meta.court_name} onChange={set('court_name')} />
              </div>
              <div className="form-group">
                <label htmlFor="u_case_num">Case Number</label>
                <input id="u_case_num" type="text" placeholder="Parsed from PDF"
                  value={meta.case_number} onChange={set('case_number')} />
              </div>
              <div className="form-group">
                <label htmlFor="u_type">Case Type</label>
                <input id="u_type" type="text" placeholder="Parsed from PDF"
                  value={meta.case_type} onChange={set('case_type')} />
              </div>
              <div className="form-group">
                <label htmlFor="u_disposal">Order / Disposal Date</label>
                <input id="u_disposal" type="date" value={meta.disposal_date} onChange={set('disposal_date')} />
              </div>

              {/* ── Must be filled by the officer ── */}
              <div className="form-group span2" style={{ borderTop: '1px solid var(--gray-200)', paddingTop: 14, marginTop: 4 }}>
                <label style={{ color: 'var(--navy)' }}>Your Department Context</label>
              </div>
              <div className="form-group">
                <label htmlFor="u_case_id">Case ID *</label>
                <input id="u_case_id" type="text" placeholder="Your internal reference e.g. WP-1234-2024"
                  value={meta.case_id} onChange={set('case_id')} />
              </div>
              <div className="form-group">
                <label htmlFor="u_role">Government Role</label>
                <select id="u_role" value={meta.government_role} onChange={set('government_role')}>
                  <option>Respondent</option>
                  <option>Petitioner</option>
                </select>
              </div>
              <div className="form-group span2">
                <label htmlFor="u_dept">Responsible Department</label>
                <input id="u_dept" type="text" placeholder="Which department handles compliance for this order"
                  value={meta.department_name} onChange={set('department_name')} />
              </div>

            </div>

            {error && (
              <div style={{ marginTop: 16, padding: '10px 14px', background: 'var(--red-light)', border: '1px solid #fed7d7', borderRadius: 6, color: 'var(--red)', fontSize: 13 }}>
                {error}
              </div>
            )}

            <div style={{ marginTop: 16 }}>
              <button className="btn btn-primary btn-full" onClick={handleSubmit} disabled={!canSubmit}>
                {parsing ? 'Reading PDF…' : 'Analyse Judgment'}
              </button>
            </div>
          </div>

        </div>
      </div>
    </>
  );
};

export default UploadPage;
