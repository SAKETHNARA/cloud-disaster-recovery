// Temporary page shown until the feature is built in a later phase.
function PlaceholderPage({ icon, title, description, phase }) {
  return (
    <div>
      <h1 className="page-title">
        {icon} {title}
      </h1>
      <p className="page-desc">{description}</p>

      <div className="card placeholder">
        <p>🚧 This page will be built in <strong>Phase {phase}</strong>.</p>
      </div>
    </div>
  )
}

export default PlaceholderPage