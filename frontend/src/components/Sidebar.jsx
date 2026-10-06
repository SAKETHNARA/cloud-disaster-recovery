import { useEffect, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";

import { menuItems } from "../menu";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../supabase";


function Sidebar() {
  const navigate = useNavigate();

  const {
    logout,
    user,
  } = useAuth();

  const [isAdmin, setIsAdmin] = useState(false);
  const [roleLoading, setRoleLoading] = useState(true);


  // -------------------------------------------------------
  // Check current user's role
  // -------------------------------------------------------

  useEffect(() => {

    async function loadRole() {

      if (!user) {
        setIsAdmin(false);
        setRoleLoading(false);
        return;
      }

      try {

        const {
          data,
          error,
        } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .single();

        if (error) {
          setIsAdmin(false);
        } else {
          setIsAdmin(data?.role === "admin");
        }

      } catch {
        setIsAdmin(false);
      } finally {
        setRoleLoading(false);
      }
    }

    loadRole();

  }, [user]);


  // -------------------------------------------------------
  // Logout
  // -------------------------------------------------------

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

      {/* -------------------------------------------------
          Brand
      ------------------------------------------------- */}

      <div className="brand">

        <span className="brand-icon">
          🛡️
        </span>

        <div>

          <div className="brand-title">
            CloudDR
          </div>

          <div className="brand-sub">
            Disaster Recovery
          </div>

        </div>

      </div>


      {/* -------------------------------------------------
          Logged-in user
      ------------------------------------------------- */}

      {user && (

        <div className="sidebar-user">

          <div className="sidebar-user-icon">
            👤
          </div>

          <div className="sidebar-user-info">

            <div className="sidebar-user-email">
              {user.email}
            </div>

            {!roleLoading && isAdmin && (
              <div className="sidebar-admin-badge">
                👑 Administrator
              </div>
            )}

          </div>

        </div>

      )}


      {/* -------------------------------------------------
          Main navigation
      ------------------------------------------------- */}

      <nav className="nav">

        {menuItems.map((item) => (

          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === "/"}
            className={({ isActive }) =>
              isActive
                ? "nav-link active"
                : "nav-link"
            }
          >

            <span className="nav-icon">
              {item.icon}
            </span>

            {item.label}

          </NavLink>

        ))}


        {/* ---------------------------------------------
            Admin navigation
        --------------------------------------------- */}

        {isAdmin && (

          <NavLink
            to="/admin"
            className={({ isActive }) =>
              isActive
                ? "nav-link admin-nav-link active"
                : "nav-link admin-nav-link"
            }
          >

            <span className="nav-icon">
              🛡️
            </span>

            Admin Panel

          </NavLink>

        )}

      </nav>


      {/* -------------------------------------------------
          Logout
      ------------------------------------------------- */}

      <button
        className="logout-btn"
        onClick={handleLogout}
      >
        🚪 Logout
      </button>

    </aside>
  );
}


export default Sidebar;