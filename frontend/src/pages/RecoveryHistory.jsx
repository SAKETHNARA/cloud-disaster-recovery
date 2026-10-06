import { useEffect, useState } from "react";
import { supabase } from "../supabase";

export default function RecoveryHistory() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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
        "http://localhost:8000/api/recovery-history",
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
          "Could not load recovery history."
        );
      }

      setRecords(
        data.recovery_history || []
      );

    } catch (err) {
      setError(
        err.message ||
        "Something went wrong."
      );
    } finally {
      setLoading(false);
    }
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
    loadHistory();
  }, []);

  return (
    <div>
      <div className="history-header">
        <div>
          <h1 className="page-title">
            📋 Recovery History
          </h1>

          <p className="page-desc">
            View previous disaster recoveries,
            RPO, RTO and recovery status.
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
          ⏳ Loading recovery history...
        </div>
      )}

      {error && (
        <div className="history-error">
          ❌ {error}
        </div>
      )}

      {!loading &&
        !error &&
        records.length === 0 && (
          <div className="card history-message">
            <h2>
              No Recovery Records
            </h2>

            <p>
              Completed disaster recoveries
              will appear here.
            </p>
          </div>
        )}

      {!loading &&
        !error &&
        records.length > 0 && (

        <div className="recovery-history-list">

          {records.map((record) => (

            <div
              className="card recovery-card"
              key={record.id}
            >

              <div className="recovery-card-header">

                <div>
                  <h2>
                    ♻️ {record.backup_name}
                  </h2>

                  <p className="recovery-id">
                    Recovery ID: {record.id}
                  </p>
                </div>

                <span
                  className={`status-badge ${record.status}`}
                >
                  {record.status === "success"
                    ? "✅ Success"
                    : record.status === "partial"
                    ? "⚠️ Partial"
                    : "❌ Failed"}
                </span>

              </div>

              <div className="recovery-grid">

                <div>
                  <span>
                    Disaster Type
                  </span>

                  <strong>
                    🔥{" "}
                    {record.disaster_type}
                  </strong>
                </div>

                <div>
                  <span>
                    Files Affected
                  </span>

                  <strong>
                    {record.disaster_files_affected}
                  </strong>
                </div>

                <div>
                  <span>
                    Files Recovered
                  </span>

                  <strong>
                    {record.files_recovered}
                  </strong>
                </div>

                <div>
                  <span>
                    Files Failed
                  </span>

                  <strong>
                    {record.files_failed}
                  </strong>
                </div>

                <div>
                  <span>
                    RPO
                  </span>

                  <strong>
                    {record.rpo_seconds ?? 0}
                    {" seconds"}
                  </strong>
                </div>

                <div>
                  <span>
                    RTO
                  </span>

                  <strong>
                    {record.rto_seconds ?? 0}
                    {" seconds"}
                  </strong>
                </div>

              </div>

              <div className="recovery-times">

                <div>
                  <span>
                    Backup Time
                  </span>

                  <strong>
                    {formatDate(
                      record.backup_time
                    )}
                  </strong>
                </div>

                <div>
                  <span>
                    Disaster Time
                  </span>

                  <strong>
                    {formatDate(
                      record.disaster_time
                    )}
                  </strong>
                </div>

                <div>
                  <span>
                    Recovery Started
                  </span>

                  <strong>
                    {formatDate(
                      record.recovery_started_at
                    )}
                  </strong>
                </div>

                <div>
                  <span>
                    Recovery Completed
                  </span>

                  <strong>
                    {formatDate(
                      record.recovery_completed_at
                    )}
                  </strong>
                </div>

              </div>

              <div className="recovery-formula">

                <strong>
                  RPO:
                </strong>{" "}
                Disaster Time − Backup Time

                <br />

                <strong>
                  RTO:
                </strong>{" "}
                Recovery Completed −
                Recovery Started

              </div>

            </div>

          ))}

        </div>
      )}
    </div>
  );
}