import { useState } from 'react'
import Dashboard from './Dashboard'
import VerificationPage from './VerificationPage'
import UploadPage from './UploadPage'
import './App.css'

function App() {
  const [page, setPage] = useState<'dashboard' | 'verify' | 'upload'>('dashboard')
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null)

  const handleSelectCase = (caseId: string) => {
    setSelectedCaseId(caseId)
    setPage('verify')
  }

  const handleUploadComplete = (caseId: string) => {
    setSelectedCaseId(caseId)
    setPage('verify')
  }

  return (
    <>
      <nav className="nav">
        <span className="nav-brand">Nyaya<span>Setu</span></span>
        <button className={`nav-btn${page === 'dashboard' ? ' active' : ''}`} onClick={() => setPage('dashboard')}>Dashboard</button>
        <button className={`nav-btn${page === 'upload' ? ' active' : ''}`} onClick={() => setPage('upload')}>Upload Judgment</button>
        <button className={`nav-btn${page === 'verify' ? ' active' : ''}`} onClick={() => setPage('verify')}>Verify</button>
      </nav>

      {page === 'dashboard' && <Dashboard onSelectCase={handleSelectCase} />}
      {page === 'upload' && <UploadPage onComplete={handleUploadComplete} />}
      {page === 'verify' && <VerificationPage caseId={selectedCaseId} />}
    </>
  )
}

export default App
