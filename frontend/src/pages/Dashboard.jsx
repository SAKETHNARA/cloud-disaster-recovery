// Dashboard page.
// NOTE: the numbers below are SAMPLE values for layout only.
// Real statistics from the database are added in Phase 12.
const stats = [
  { label: 'Total Backups', value: '0', color: 'blue' },
  { label: 'Successful Backups', value: '0', color: 'green' },
  { label: 'Failed Backups', value: '0', color: 'red' },
  { label: 'Recovered Files', value: '0', color: 'purple' },
  { label: 'Avg Recovery Time', value: '0 s', color: 'orange' },
  { label: 'Cloud Storage Used', value: '0 MB', color: 'teal' },
]

const steps = [
  { icon: '☁️', title: '1. Backup', text: 'Files are copied to cloud storage.' },
  { icon: '🔥', title: '2. Disaster', text: 'Demo files are deleted (simulation).' },
  { icon: '♻️', title: '3. Recovery', text: 'Files are restored from the cloud.' },
]

function Dashboard() {
  return (
    <div>
      <h1 className="page-title">📊 Dashboard</h1>
      <p className="page-desc">
        Cloud-Based Disaster Recovery Management System
      </p>

      <div className="stats-grid">
        {stats.map((s) => (
          <div key={s.label} className={`card stat ${s.color}`}>
            <div className="stat-value">{s.value}</div>
            <div className="stat-label">{s.label}</div>
          </div>
        ))}
      </div>

      <h2 className="section-title">How the system works</h2>
      <div className="steps-grid">
        {steps.map((s) => (
          <div key={s.title} className="card step">
            <div className="step-icon">{s.icon}</div>
            <h3>{s.title}</h3>
            <p>{s.text}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

export default Dashboard