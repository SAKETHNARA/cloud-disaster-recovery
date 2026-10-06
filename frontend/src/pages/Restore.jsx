import { useEffect, useState } from "react";
import { supabase } from "../supabase";

export default function Restore() {
  const [disaster, setDisaster] = useState(null);
  const [backups, setBackups] = useState([]);
  const [selectedBackup, setSelectedBackup] = useState("");
  const [loading, setLoading] = useState(true);
  const [restoring, setRestoring] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

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

  async function loadRestoreData() {
    setLoading(true);
    setError("");

    try {
      const token = await getToken();

      const [
        disasterResponse,
        backupsResponse,
      ] = await Promise.all([
        fetch(
          "http://localhost:8000/api/disaster/latest",
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        ),
        fetch(
          "http://localhost:8000/api/backups",
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        ),
      ]);

      const disasterData =
        await disasterResponse.json();

      const backupsData =
        await backupsResponse.json();

      if (!disasterResponse.ok) {
        throw new Error(
          disasterData.detail ||
          "Could not load disaster information."
        );
      }

      if (!backupsResponse.ok) {
        throw new Error(
          backupsData.detail ||
          "Could not load backups."
        );
      }

      setDisaster(
        disasterData.active
          ? disasterData.disaster
          : null
      );

      const successfulBackups =
        (backupsData.backups || []).filter(
          (backup) =>
            backup.status === "success"
        );

      setBackups(successfulBackups);

      if (successfulBackups.length > 0) {
        setSelectedBackup(
          successfulBackups[0].id
        );
      }

    } catch (err) {

      setError(
        err.message ||
        "Something went wrong."
      );

    } finally {

      setLoading(false);
    }
  }

  async function restoreData() {
    if (!selectedBackup) {
      setError(
        "Please select a backup first."
      );
      return;
    }

    const confirmed = window.confirm(
      "Restore the selected cloud backup into the restored_files folder?"
    );

    if (!confirmed) {
      return;
    }

    setRestoring(true);
    setError("");
    setResult(null);

    try {
      const token = await getToken();

      const response = await fetch(
        "http://localhost:8000/api/restore",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            backup_id: selectedBackup,
          }),
        }
      );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail ||
          "Restore failed."
        );
      }

      setResult(data);

      await loadRestoreData();

    } catch (err) {

      setError(
        err.message ||
        "Something went wrong."
      );

    } finally {

      setRestoring(false);
    }
  }

  useEffect(() => {
    loadRestoreData();
  }, []);

  return (
    <div>
      <h1 className="page-title">
        ♻️ Restore Data
      </h1>

      <p className="page-desc">
        Recover files from a cloud backup
        after a simulated disaster.
      </p>

      {loading && (
        <div className="card history-message">
          ⏳ Loading recovery information...
        </div>
      )}

      {error && (
        <div className="history-error">
          ❌ {error}
        </div>
      )}

      {!loading && (
        <>
          <div className="card restore-disaster-card">
            <h2>
              🔥 Current Disaster
            </h2>

            {disaster ? (
              <>
                <div className="restore-disaster-grid">

                  <div>
                    <span>Type</span>
                    <strong>
                      {disaster.disaster_type}
                    </strong>
                  </div>

                  <div>
                    <span>Files Affected</span>
                    <strong>
                      {disaster.files_affected}
                    </strong>
                  </div>

                  <div>
                    <span>Occurred At</span>
                    <strong>
                      {formatDate(
                        disaster.occurred_at
                      )}
                    </strong>
                  </div>

                  <div>
                    <span>Status</span>
                    <strong>
                      🟠 {disaster.status}
                    </strong>
                  </div>

                </div>
              </>
            ) : (
              <p className="restore-empty">
                ✅ There is no active disaster.
                Simulate a disaster before
                restoring data.
              </p>
            )}
          </div>

          <div className="card restore-backup-card">

            <h2>
              ☁️ Select Cloud Backup
            </h2>

            <p className="restore-description">
              Choose a successful backup that
              was created before the disaster.
            </p>

            {backups.length === 0 ? (
              <div className="restore-empty">
                No successful backups available.
              </div>
            ) : (
              <div className="restore-options">

                {backups.map((backup) => (
                  <label
                    className={
                      selectedBackup === backup.id
                        ? "restore-option selected"
                        : "restore-option"
                    }
                    key={backup.id}
                  >
                    <input
                      type="radio"
                      name="backup"
                      value={backup.id}
                      checked={
                        selectedBackup ===
                        backup.id
                      }
                      onChange={() =>
                        setSelectedBackup(
                          backup.id
                        )
                      }
                    />

                    <div>
                      <strong>
                        ☁️ {backup.backup_name}
                      </strong>

                      <p>
                        {backup.total_files} files
                        {" • "}
                        {formatBytes(
                          backup.total_size_bytes
                        )}
                        {" • "}
                        {formatDate(
                          backup.created_at
                        )}
                      </p>

                      {backup.files?.length > 0 && (
                        <div className="restore-file-list">
                          {backup.files.map(
                            (file) => (
                              <div
                                key={
                                  file.storage_path
                                }
                              >
                                📄{" "}
                                {file.file_name}
                              </div>
                            )
                          )}
                        </div>
                      )}
                    </div>
                  </label>
                ))}

              </div>
            )}

            <button
              className="restore-btn"
              onClick={restoreData}
              disabled={
                restoring ||
                !disaster ||
                !selectedBackup
              }
            >
              {restoring
                ? "♻️ Restoring..."
                : "♻️ Restore Selected Backup"}
            </button>

          </div>

          {result && (
            <div className="card restore-result">

              <h2>
                ✅ Recovery Completed
              </h2>

              <div className="restore-result-grid">

                <div>
                  <span>Status</span>
                  <strong>
                    {result.status}
                  </strong>
                </div>

                <div>
                  <span>Files Recovered</span>
                  <strong>
                    {result.files_recovered}
                  </strong>
                </div>

                <div>
                  <span>Files Failed</span>
                  <strong>
                    {result.files_failed}
                  </strong>
                </div>

                <div>
                  <span>RPO</span>
                  <strong>
                    {result.rpo_seconds} seconds
                  </strong>
                </div>

                <div>
                  <span>RTO</span>
                  <strong>
                    {result.rto_seconds} seconds
                  </strong>
                </div>

              </div>

              <h3>
                Restored Files
              </h3>

              {result.recovered_files?.map(
                (file) => (
                  <div
                    className="file-row"
                    key={file.file_name}
                  >
                    <span>
                      ♻️ {file.file_name}
                    </span>

                    <span>
                      {formatBytes(file.size)}
                    </span>
                  </div>
                )
              )}

              <div className="restore-folder-note">
                📂 Restored files are available
                inside the project's
                <strong> restored_files </strong>
                folder.
              </div>

            </div>
          )}
        </>
      )}
    </div>
  );
}