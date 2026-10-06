import { useEffect, useState } from "react";
import { supabase } from "../supabase";

export default function BackupHistory() {
  const [backups, setBackups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  function formatBytes(bytes) {
    if (!bytes || bytes === 0) {
      return "0 Bytes";
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

    return new Date(dateString).toLocaleString(
      "en-IN",
      {
        dateStyle: "medium",
        timeStyle: "short",
      }
    );
  }

  async function loadHistory() {
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
        "http://localhost:8000/api/backups",
        {
          method: "GET",
          headers: {
            Authorization:
              `Bearer ${session.access_token}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail ||
          "Failed to load backup history."
        );
      }

      setBackups(data.backups || []);

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
    loadHistory();
  }, []);

  return (
    <div>
      <div className="history-header">
        <div>
          <h1 className="page-title">
            🕒 Backup History
          </h1>

          <p className="page-desc">
            View all backups created by your account.
          </p>
        </div>

        <button
          className="refresh-btn"
          onClick={loadHistory}
          disabled={loading}
        >
          🔄 Refresh
        </button>
      </div>

      {loading && (
        <div className="card history-message">
          <p>⏳ Loading backup history...</p>
        </div>
      )}

      {error && (
        <div className="history-error">
          ❌ {error}
        </div>
      )}

      {!loading && !error && backups.length === 0 && (
        <div className="card history-message">
          <h2>No Backups Yet</h2>

          <p>
            Your backup history will appear here
            after you create your first backup.
          </p>
        </div>
      )}

      {!loading && !error && backups.length > 0 && (
        <div className="history-list">

          {backups.map((backup) => (
            <div
              className="card backup-history-card"
              key={backup.id}
            >
              <div className="backup-history-top">

                <div>
                  <h2>
                    ☁️ {backup.backup_name}
                  </h2>

                  <p className="backup-id">
                    ID: {backup.id}
                  </p>
                </div>

                <span
                  className={`status-badge ${backup.status}`}
                >
                  {backup.status === "success"
                    ? "✅ Success"
                    : backup.status === "failed"
                    ? "❌ Failed"
                    : "⏳ In Progress"}
                </span>

              </div>

              <div className="history-stats">

                <div>
                  <span>Files</span>
                  <strong>
                    {backup.total_files}
                  </strong>
                </div>

                <div>
                  <span>Total Size</span>
                  <strong>
                    {formatBytes(
                      backup.total_size_bytes
                    )}
                  </strong>
                </div>

                <div>
                  <span>Created</span>
                  <strong>
                    {formatDate(
                      backup.created_at
                    )}
                  </strong>
                </div>

                <div>
                  <span>Completed</span>
                  <strong>
                    {formatDate(
                      backup.completed_at
                    )}
                  </strong>
                </div>

              </div>

              <div className="history-files">

                <h3>
                  Files in this backup
                </h3>

                {backup.files?.length > 0 ? (
                  backup.files.map((file) => (
                    <div
                      className="history-file-row"
                      key={file.storage_path}
                    >
                      <span>
                        📄 {file.file_name}
                      </span>

                      <span>
                        {formatBytes(
                          file.file_size_bytes
                        )}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="no-files">
                    No file records found.
                  </p>
                )}

              </div>

            </div>
          ))}

        </div>
      )}
    </div>
  );
}