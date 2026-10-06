import { NavLink } from 'react-router-dom'
import { menuItems } from '../menu'

// Left-side navigation bar.
function Sidebar() {
  const handleLogout = () => {
    // Real logout will be added in Phase 6 (Authentication).
    alert('Logout will work after Phase 6 (Authentication).')
  }

  return (
    <aside className="sidebar">
      <div className="brand">
        <span className="brand-icon">🛡️</span>
        <div>
          <div className="brand-title">CloudDR</div>
          <div className="brand-sub">Disaster Recovery</div>
        </div>
      </div>

      <nav className="nav">
        {menuItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/'}
            className={({ isActive }) =>
              isActive ? 'nav-link active' : 'nav-link'
            }
          >
            <span className="nav-icon">{item.icon}</span>
            {item.label}
          </NavLink>
        ))}
      </nav>

      <button className="logout-btn" onClick={handleLogout}>
        🚪 Logout
      </button>
    </aside>
  )
}

export default Sidebar