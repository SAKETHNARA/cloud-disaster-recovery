import { useEffect, useState } from "react";
import { supabase } from "../supabase";

export default function Disaster() {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [simulating, setSimulating] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  async function getToken() {
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();

    if (error) {
      throw new Error(error.message);
    }

    if (!session?.access_token) {
      throw new Error(
        "Your session has expired. Please login again."
      );
    }

    return session.access_token;
  }

  async function loadFiles() {
    setLoading(true);
    setError("");

    try {
      const token = await getToken();

      const response = await fetch(
        "http://localhost:8000/api/disaster/files",
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail ||
          "Could not load demo files."
        );
      }

      setFiles(data.files || []);

    } catch (err) {
      setError(
        err.message ||
        "Something went wrong."
      );
    } finally {
      setLoading(false);
    }
  }

  async function simulateDisaster() {
    const confirmed = window.confirm(
      "This will delete the files inside the demo_files folder. Continue?"
    );

    if (!confirmed) {
      return;
    }

    setSimulating(true);
    setError("");
    setResult(null);

    try {
      const token = await getToken();

      const response = await fetch(
        "http://localhost:8000/api/disaster/simulate",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail ||
          "Disaster simulation failed."
        );
      }

      setResult(data);
      setFiles([]);

    } catch (err) {
      setError(
        err.message ||
        "Something went wrong."
      );
    } finally {
      setSimulating(false);
    }
  }

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

  useEffect(() => {
    loadFiles();
  }, []);

  return (
    <div>
      <h1 className="page-title">
        🔥 Disaster Simulation
      </h1>

      <p className="page-desc">
        Safely simulate accidental deletion
        inside the demo folder.
      </p>

      <div className="card disaster-warning">
        <h2>
          ⚠️ Demo Data Loss Simulation
        </h2>

        <p>
          This feature deletes only files from
          the project's <strong>demo_files</strong>
          folder.
        </p>

        <p>
          Your cloud backups in Supabase
          Storage are not deleted.
        </p>
      </div>

      <div className="card disaster-files">

        <div className="disaster-files-header">
          <div>
            <h2>
              Files currently in demo folder
            </h2>

            <p>
              These files will be affected by
              the simulation.
            </p>
          </div>

          <button
            className="refresh-btn"
            onClick={loadFiles}
            disabled={loading || simulating}
          >
            🔄 Refresh
          </button>
        </div>

        {loading && (
          <p>⏳ Loading files...</p>
        )}

        {!loading && files.length === 0 && (
          <div className="empty-demo">
            📂 No demo files found.
          </div>
        )}

        {files.length > 0 && (
          <div className="disaster-file-list">

            {files.map((file) => (
              <div
                className="file-row"
                key={file.name}
              >
                <span>
                  📄 {file.name}
                </span>

                <span>
                  {formatBytes(file.size)}
                </span>
              </div>
            ))}

          </div>
        )}

      </div>

      {error && (
        <div className="history-error">
          ❌ {error}
        </div>
      )}

      <div className="card disaster-action">

        <h2>
          Simulate Disaster
        </h2>

        <p>
          Click the button below to simulate
          accidental data deletion.
        </p>

        <button
          className="disaster-btn"
          onClick={simulateDisaster}
          disabled={
            simulating ||
            loading ||
            files.length === 0
          }
        >
          {simulating
            ? "🔥 Simulating..."
            : "🔥 Simulate Disaster"}
        </button>

      </div>

      {result && (
        <div className="card disaster-result">

          <h2>
            ✅ Disaster Recorded
          </h2>

          <div className="disaster-result-grid">

            <div>
              <span>Disaster ID</span>
              <strong>
                {result.disaster_id}
              </strong>
            </div>

            <div>
              <span>Type</span>
              <strong>
                {result.disaster_type}
              </strong>
            </div>

            <div>
              <span>Files Affected</span>
              <strong>
                {result.files_affected}
              </strong>
            </div>

            <div>
              <span>Status</span>
              <strong>
                {result.status}
              </strong>
            </div>

            <div>
              <span>Occurred At</span>
              <strong>
                {formatDate(
                  result.occurred_at
                )}
              </strong>
            </div>

          </div>

          <h3>
            Deleted Files
          </h3>

          {result.deleted_files?.map(
            (file) => (
              <div
                className="file-row"
                key={file}
              >
                <span>
                  🗑️ {file}
                </span>

                <span>
                  Deleted
                </span>
              </div>
            )
          )}

          <div className="next-step-note">
            ♻️ The files can now be restored
            from the cloud backup in Phase 10.
          </div>

        </div>
      )}
    </div>
  );
}