import { useEffect, useState } from "react";
import { supabase } from "../supabase";

export default function AdminDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadAdminDashboard() {
    setLoading(true);
    setError("");

    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError) {
        throw new Error(sessionError.message);
      }

      if (!session?.access_token) {
        throw new Error(
          "Your session has expired. Please login again."
        );
      }

      const response = await fetch(
        "http://localhost:8000/api/admin/dashboard",
        {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.detail ||
            "Could not load admin dashboard."
        );
      }

      setData(result);

    } catch (err) {
      setError(
        err.message ||
          "Something went wrong."
      );
    } finally {
      setLoading(false);
    }
  }

  function formatBytes(bytes) {
    if (!bytes || bytes === 0) {
      return "0 MB";
    }

    const units = [
      "Bytes",
      "KB",
      "MB",
      "GB",
    ];

    const index = Math.floor(
      Math.log(bytes) / Math.log(1024)
    );

    return `${(
      bytes / 1024 ** index
    ).toFixed(2)} ${units[index]}`;
  }

  function formatDate(dateString) {
    if (!dateString) {
      return "—";
    }

    return new Date(
      dateString
    ).toLocaleString("en-IN", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  }

  useEffect(() => {
    loadAdminDashboard();
  }, []);

  if (loading) {
    return (
      <div>
        <h1 className="page-title">
          🛡️ Admin Dashboard
        </h1>

        <div className="card dashboard-message">
          ⏳ Loading admin data...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <h1 className="page-title">
          🛡️ Admin Dashboard
        </h1>

        <div className="history-error">
          ❌ {error}
        </div>

        <p style={{ marginTop: "12px" }}>
          Only accounts with the{" "}
          <strong>admin</strong> role can
          access this page.
        </p>
      </div>
    );
  }

  const stats = data.statistics;

  return (
    <div>

      <div className="dashboard-header">
        <div>
          <h1 className="page-title">
            🛡️ Admin Dashboard
          </h1>

          <p className="page-desc">
            System-wide disaster recovery
            monitoring and administration.
          </p>
        </div>

        <button
          className="refresh-btn"
          onClick={loadAdminDashboard}
        >
          🔄 Refresh
        </button>
      </div>

      <div className="admin-role-banner">
        👑 Administrator access
      </div>

      {/* Statistics */}

      <div className="stats-grid">

        <div className="card stat blue">
          <div className="stat-value">
            {stats.total_users}
          </div>

          <div className="stat-label">
            Total Users
          </div>
        </div>

        <div className="card stat blue">
          <div className="stat-value">
            {stats.total_backups}
          </div>

          <div className="stat-label">
            Total Backups
          </div>
        </div>

        <div className="card stat green">
          <div className="stat-value">
            {stats.successful_backups}
          </div>

          <div className="stat-label">
            Successful Backups
          </div>
        </div>

        <div className="card stat red">
          <div className="stat-value">
            {stats.failed_backups}
          </div>

          <div className="stat-label">
            Failed Backups
          </div>
        </div>

        <div className="card stat orange">
          <div className="stat-value">
            {stats.total_disasters}
          </div>

          <div className="stat-label">
            Disaster Events
          </div>
        </div>

        <div className="card stat purple">
          <div className="stat-value">
            {stats.total_recoveries}
          </div>

          <div className="stat-label">
            Recoveries
          </div>
        </div>

        <div className="card stat green">
          <div className="stat-value">
            {stats.recovered_files}
          </div>

          <div className="stat-label">
            Recovered Files
          </div>
        </div>

        <div className="card stat teal">
          <div className="stat-value">
            {formatBytes(
              stats.total_storage_bytes
            )}
          </div>

          <div className="stat-label">
            Cloud Storage Used
          </div>
        </div>

      </div>

      {/* Users */}

      <h2 className="section-title">
        👥 Registered Users
      </h2>

      <div className="card admin-table-card">

        {data.users.length === 0 ? (
          <p>No users found.</p>
        ) : (
          <div className="admin-table">

            <div className="admin-table-header">
              <span>Name</span>
              <span>Role</span>
              <span>Created</span>
            </div>

            {data.users.map((user) => (
              <div
                className="admin-table-row"
                key={user.id}
              >
                <span>
                  {user.full_name ||
                    "Unnamed User"}
                </span>

                <span
                  className={
                    user.role === "admin"
                      ? "admin-role"
                      : "user-role"
                  }
                >
                  {user.role}
                </span>

                <span>
                  {formatDate(
                    user.created_at
                  )}
                </span>
              </div>
            ))}

          </div>
        )}

      </div>

      {/* Recent Backups */}

      <h2 className="section-title">
        ☁️ Recent Backups
      </h2>

      <div className="recent-backups">

        {data.recent_backups.length === 0 ? (
          <div className="card dashboard-message">
            No backups found.
          </div>
        ) : (
          data.recent_backups.map(
            (backup) => (
              <div
                className="card recent-backup-card"
                key={backup.id}
              >

                <div>
                  <h3>
                    ☁️ {backup.backup_name}
                  </h3>

                  <p>
                    {formatDate(
                      backup.created_at
                    )}
                  </p>
                </div>

                <div className="recent-backup-info">

                  <span>
                    {backup.total_files} files
                  </span>

                  <span>
                    {formatBytes(
                      backup.total_size_bytes
                    )}
                  </span>

                  <span
                    className={`status-badge ${backup.status}`}
                  >
                    {backup.status ===
                    "success"
                      ? "✅ Success"
                      : backup.status ===
                        "failed"
                      ? "❌ Failed"
                      : "⏳ In Progress"}
                  </span>

                </div>

              </div>
            )
          )
        )}

      </div>

      {/* Disaster Events */}

      <h2 className="section-title">
        🔥 Recent Disaster Events
      </h2>

      <div className="recent-backups">

        {data.recent_disasters.length === 0 ? (
          <div className="card dashboard-message">
            No disaster events found.
          </div>
        ) : (
          data.recent_disasters.map(
            (disaster) => (
              <div
                className="card recent-backup-card"
                key={disaster.id}
              >

                <div>
                  <h3>
                    🔥{" "}
                    {disaster.disaster_type}
                  </h3>

                  <p>
                    {formatDate(
                      disaster.occurred_at
                    )}
                  </p>
                </div>

                <div className="recent-backup-info">

                  <span>
                    {disaster.files_affected}{" "}
                    files affected
                  </span>

                  <span
                    className={`status-badge ${
                      disaster.status ===
                      "active"
                        ? "in_progress"
                        : "success"
                    }`}
                  >
                    {disaster.status ===
                    "active"
                      ? "🟠 Active"
                      : "✅ Recovered"}
                  </span>

                </div>

              </div>
            )
          )
        )}

      </div>

    </div>
  );
}