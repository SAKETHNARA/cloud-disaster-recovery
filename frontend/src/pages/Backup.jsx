import { useState } from "react";
import { supabase } from "../supabase";

const MAX_FILE_SIZE = 5 * 1024 * 1024;

export default function Backup() {
  const [files, setFiles] = useState([]);
  const [backupName, setBackupName] = useState("My Backup");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  function handleFileChange(event) {
    setMessage("");
    setError("");
    setResult(null);

    const selectedFiles = Array.from(event.target.files || []);

    const oversizedFile = selectedFiles.find(
      (file) => file.size > MAX_FILE_SIZE
    );

    if (oversizedFile) {
      setError(`${oversizedFile.name} is larger than 5 MB.`);
      setFiles([]);
      return;
    }

    setFiles(selectedFiles);
  }

  function formatBytes(bytes) {
    if (bytes === 0) return "0 Bytes";

    const units = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));

    return `${(bytes / 1024 ** i).toFixed(2)} ${units[i]}`;
  }

  async function handleBackup(event) {
    event.preventDefault();

    setMessage("");
    setError("");
    setResult(null);

    if (files.length === 0) {
      setError("Please select at least one file.");
      return;
    }

    setLoading(true);

    try {
      // Get the currently logged-in user's access token.
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError) {
        throw new Error(sessionError.message);
      }

      if (!session?.access_token) {
        throw new Error("Your session has expired. Please login again.");
      }

      const formData = new FormData();

      files.forEach((file) => {
        formData.append("files", file);
      });

      formData.append(
        "backup_name",
        backupName.trim() || "Manual Backup"
      );

      const response = await fetch("http://localhost:8000/api/backups", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Backup failed.");
      }

      setResult(data);
      setMessage("Backup completed successfully.");
      setFiles([]);
    } catch (err) {
      setError(err.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h1 className="page-title">☁️ Backup Files</h1>

      <p className="page-desc">
        Select files and securely back them up to cloud storage.
      </p>

      <form className="backup-form" onSubmit={handleBackup}>
        <div className="card">
          <label className="form-label">Backup Name</label>

          <input
            className="text-input"
            type="text"
            value={backupName}
            onChange={(e) => setBackupName(e.target.value)}
            placeholder="Enter backup name"
          />

          <label className="form-label">Select Files</label>

          <input
            className="file-input"
            type="file"
            multiple
            onChange={handleFileChange}
          />

          <p className="file-help">
            Maximum size: 5 MB per file.
          </p>

          {files.length > 0 && (
            <div className="selected-files">
              <h3>Selected Files</h3>

              {files.map((file) => (
                <div className="file-row" key={`${file.name}-${file.size}`}>
                  <span>📄 {file.name}</span>
                  <span>{formatBytes(file.size)}</span>
                </div>
              ))}
            </div>
          )}

          <button
            className="backup-btn"
            type="submit"
            disabled={loading}
          >
            {loading ? "☁️ Backing Up..." : "☁️ Backup Files"}
          </button>
        </div>
      </form>

      {message && (
        <div className="result-success">
          ✅ {message}
        </div>
      )}

      {error && (
        <div className="result-error">
          ❌ {error}
        </div>
      )}

      {result && (
        <div className="card backup-result">
          <h2>Backup Details</h2>

          <p>
            <strong>Backup ID:</strong> {result.backup_id}
          </p>

          <p>
            <strong>Backup Name:</strong> {result.backup_name}
          </p>

          <p>
            <strong>Files:</strong> {result.total_files}
          </p>

          <p>
            <strong>Total Size:</strong>{" "}
            {formatBytes(result.total_size_bytes)}
          </p>

          <h3>Cloud Files</h3>

          {result.files?.map((file) => (
            <div className="file-row" key={file.storage_path}>
              <span>📄 {file.file_name}</span>
              <span>{formatBytes(file.file_size_bytes)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}