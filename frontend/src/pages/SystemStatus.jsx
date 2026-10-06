import { useEffect, useState } from "react";
import { supabase } from "../supabase";

export default function SystemStatus() {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadStatus() {
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
        "http://localhost:8000/api/status",
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
          "Could not load system status."
        );
      }

      setStatus(data);
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
    loadStatus();
  }, []);

  function StatusCard({
    icon,
    title,
    value,
  }) {
    const online =
      value === "online";

    return (
      <div
        className={
          online
            ? "card system-status-card online"
            : "card system-status-card offline"
        }
      >
        <div className="system-status-icon">
          {icon}
        </div>

        <div>
          <h2>{title}</h2>

          <p
            className={
              online
                ? "system-online"
                : "system-offline"
            }
          >
            {online
              ? "● Online"
              : `● ${value}`}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="dashboard-header">
        <div>
          <h1 className="page-title">
            🩺 System Status
          </h1>

          <p className="page-desc">
            Live health status of the disaster
            recovery system.
          </p>
        </div>

        <button
          className="refresh-btn"
          onClick={loadStatus}
          disabled={loading}
        >
          🔄 Check Again
        </button>
      </div>

      {loading && (
        <div className="card dashboard-message">
          ⏳ Checking system components...
        </div>
      )}

      {error && (
        <div className="history-error">
          ❌ {error}
        </div>
      )}

      {!loading && status && (
        <>
          <div className="system-status-grid">
            <StatusCard
              icon="⚡"
              title="FastAPI Backend"
              value={status.backend}
            />

            <StatusCard
              icon="🗄️"
              title="Supabase Database"
              value={status.database}
            />

            <StatusCard
              icon="☁️"
              title="Supabase Storage"
              value={status.storage}
            />

            <StatusCard
              icon="📦"
              title="Backups Bucket"
              value={status.bucket}
            />
          </div>

          <div className="card status-summary">
            <h2>
              System Summary
            </h2>

            <div className="status-summary-row">
              <span>
                Bucket Name
              </span>

              <strong>
                {status.bucket_name}
              </strong>
            </div>

            <div className="status-summary-row">
              <span>
                Last Checked
              </span>

              <strong>
                {new Date(
                  status.checked_at
                ).toLocaleString("en-IN")}
              </strong>
            </div>

            <div className="status-summary-row">
              <span>
                Overall Status
              </span>

              <strong className="system-online">
                ✅ System Operational
              </strong>
            </div>
          </div>
        </>
      )}
    </div>
  );
}