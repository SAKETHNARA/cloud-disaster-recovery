import { NavLink, useNavigate } from "react-router-dom";
import { menuItems } from "../menu";
import { useAuth } from "../context/AuthContext";

function Sidebar() {
  const navigate = useNavigate();
  const { logout, user } = useAuth();

  async function handleLogout() {
    const { error } = await logout();

    if (error) {
      alert(error.message);
      return;
    }

    navigate("/login");
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

      {user && (
        <div
          style={{
            padding: "12px 8px",
            fontSize: "13px",
            color: "#94a3b8",
            borderBottom: "1px solid #1e293b",
          }}
        >
          👤 {user.email}
        </div>
      )}

      <nav className="nav">
        {menuItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === "/"}
            className={({ isActive }) =>
              isActive ? "nav-link active" : "nav-link"
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
  );
}

export default Sidebar;