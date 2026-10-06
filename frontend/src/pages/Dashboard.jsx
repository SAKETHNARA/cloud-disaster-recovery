import { useEffect, useState } from "react";
import { supabase } from "../supabase";

const steps = [
  {
    icon: "☁️",
    title: "1. Backup",
    text: "Files are copied to secure cloud storage.",
  },
  {
    icon: "🔥",
    title: "2. Disaster",
    text: "Demo files are deleted to simulate data loss.",
  },
  {
    icon: "♻️",
    title: "3. Recovery",
    text: "Files are restored from the cloud backup.",
  },
];

export default function Dashboard() {
  const [stats, setStats] = useState({
    total_backups: 0,
    successful_backups: 0,
    failed_backups: 0,
    recovered_files: 0,
    average_recovery_time: 0,
    cloud_storage_bytes: 0,
    recent_backups: [],
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  function formatBytes(bytes) {
    if (!bytes || bytes === 0) {
      return "0 MB";
    }

    const units = ["Bytes", "KB", "MB", "GB"];

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

  async function loadDashboard() {
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
        "http://localhost:8000/api/dashboard",
        {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail ||
          "Could not load dashboard."
        );
      }

      setStats(data);
    } catch (err) {
      setError(
        err.message ||
        "Something went wrong."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDashboard();
  }, []);

  return (
    <div>
      <div className="dashboard-header">
        <div>
          <h1 className="page-title">
            📊 Dashboard
          </h1>

          <p className="page-desc">
            Cloud-Based Disaster Recovery Management System
          </p>
        </div>

        <button
          className="refresh-btn"
          onClick={loadDashboard}
          disabled={loading}
        >
          🔄 Refresh
        </button>
      </div>

      {error && (
        <div className="history-error">
          ❌ {error}
        </div>
      )}

      <div className="stats-grid">
        <div className="card stat blue">
          <div className="stat-value">
            {loading ? "..." : stats.total_backups}
          </div>
          <div className="stat-label">
            Total Backups
          </div>
        </div>

        <div className="card stat green">
          <div className="stat-value">
            {loading
              ? "..."
              : stats.successful_backups}
          </div>
          <div className="stat-label">
            Successful Backups
          </div>
        </div>

        <div className="card stat red">
          <div className="stat-value">
            {loading
              ? "..."
              : stats.failed_backups}
          </div>
          <div className="stat-label">
            Failed Backups
          </div>
        </div>

        <div className="card stat purple">
          <div className="stat-value">
            {loading
              ? "..."
              : stats.recovered_files}
          </div>
          <div className="stat-label">
            Recovered Files
          </div>
        </div>

        <div className="card stat orange">
          <div className="stat-value">
            {loading
              ? "..."
              : `${stats.average_recovery_time} s`}
          </div>
          <div className="stat-label">
            Avg Recovery Time
          </div>
        </div>

        <div className="card stat teal">
          <div className="stat-value">
            {loading
              ? "..."
              : formatBytes(
                  stats.cloud_storage_bytes
                )}
          </div>
          <div className="stat-label">
            Cloud Storage Used
          </div>
        </div>
      </div>

      <h2 className="section-title">
        Recent Backups
      </h2>

      {loading && (
        <div className="card dashboard-message">
          ⏳ Loading dashboard data...
        </div>
      )}

      {!loading &&
        stats.recent_backups.length === 0 && (
          <div className="card dashboard-message">
            No backups have been created yet.
          </div>
        )}

      {!loading &&
        stats.recent_backups.length > 0 && (
          <div className="recent-backups">
            {stats.recent_backups.map(
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
            )}
          </div>
        )}

      <h2 className="section-title">
        How the system works
      </h2>

      <div className="steps-grid">
        {steps.map((step) => (
          <div
            key={step.title}
            className="card step"
          >
            <div className="step-icon">
              {step.icon}
            </div>

            <h3>{step.title}</h3>

            <p>{step.text}</p>
          </div>
        ))}
      </div>
    </div>
  );
}