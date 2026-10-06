import { useEffect, useState } from "react";
import { supabase } from "../supabase";

export default function CloudStorage() {
  const [data, setData] = useState({
    bucket: "backups",
    total_files: 0,
    total_size_bytes: 0,
    files: [],
  });

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

    return new Date(
      dateString
    ).toLocaleString("en-IN", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  }

  async function loadStorage() {
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
        "http://localhost:8000/api/storage",
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
          "Could not load cloud storage."
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

  useEffect(() => {
    loadStorage();
  }, []);

  return (
    <div>
      <div className="dashboard-header">
        <div>
          <h1 className="page-title">
            🗄️ Cloud Storage
          </h1>

          <p className="page-desc">
            Files currently stored in the private
            Supabase backup bucket.
          </p>
        </div>

        <button
          className="refresh-btn"
          onClick={loadStorage}
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

      <div className="storage-summary-grid">

        <div className="card storage-summary-card">
          <span>Bucket</span>
          <strong>
            ☁️ {data.bucket}
          </strong>
        </div>

        <div className="card storage-summary-card">
          <span>Files</span>
          <strong>
            {loading
              ? "..."
              : data.total_files}
          </strong>
        </div>

        <div className="card storage-summary-card">
          <span>Total Size</span>
          <strong>
            {loading
              ? "..."
              : formatBytes(
                  data.total_size_bytes
                )}
          </strong>
        </div>

      </div>

      <div className="card storage-files-card">
        <h2>
          ☁️ Stored Backup Files
        </h2>

        {loading && (
          <p>
            ⏳ Loading cloud files...
          </p>
        )}

        {!loading &&
          data.files.length === 0 && (
            <div className="history-message">
              No files are currently stored.
            </div>
          )}

        {!loading &&
          data.files.length > 0 && (
            <div className="storage-file-list">

              {data.files.map((file) => (
                <div
                  className="storage-file-row"
                  key={`${file.storage_path}-${file.created_at}`}
                >
                  <div>
                    <strong>
                      📄 {file.file_name}
                    </strong>

                    <p>
                      {file.storage_path}
                    </p>
                  </div>

                  <div className="storage-file-meta">
                    <span>
                      {formatBytes(
                        file.file_size_bytes
                      )}
                    </span>

                    <span>
                      {formatDate(
                        file.created_at
                      )}
                    </span>
                  </div>
                </div>
              ))}

            </div>
          )}

      </div>
    </div>
  );
}