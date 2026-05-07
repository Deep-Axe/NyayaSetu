import { useState } from 'react'
import Dashboard from './Dashboard'
import VerificationPage from './VerificationPage'
import './App.css'

function App() {
  const [page, setPage] = useState<'dashboard' | 'verify'>('dashboard')
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null)

  const handleSelectCase = (caseId: string) => {
    setSelectedCaseId(caseId)
    setPage('verify')
  }

  return (
    <div className="app-container">
      <nav style={{ padding: '10px', backgroundColor: '#1a365d', color: 'white', display: 'flex', gap: '20px' }}>
        <div style={{ fontWeight: 'bold', marginRight: 'auto' }}>NyayaSetu</div>
        <button onClick={() => setPage('dashboard')} style={{ color: 'white', background: 'none', border: 'none', cursor: 'pointer' }}>Dashboard</button>
        <button onClick={() => setPage('verify')} style={{ color: 'white', background: 'none', border: 'none', cursor: 'pointer' }}>Verification</button>
      </nav>

      <main>
        {page === 'dashboard'
          ? <Dashboard onSelectCase={handleSelectCase} />
          : <VerificationPage caseId={selectedCaseId} />}
      </main>
    </div>
  )
}

export default App
