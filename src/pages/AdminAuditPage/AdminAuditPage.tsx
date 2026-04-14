import { useEffect, useState, useMemo } from "react";
import { useLang } from "../../context/LangContext";
import { getAuditLog, type AdminActionDoc, type AdminActionType } from "../../services/auditLogService";
import "./AdminAuditPage.css";

const PAGE_SIZE = 20;

const AdminAuditPage = () => {
  const { t } = useLang();
  const [entries, setEntries] = useState<AdminActionDoc[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [actionFilter, setActionFilter] = useState("");
  const [searchFilter, setSearchFilter] = useState("");

  const [page, setPage] = useState(0);

  useEffect(() => {
    getAuditLog(500).then((data) => {
      setEntries(data);
      setLoading(false);
    });
  }, []);

  const actionLabels: Record<AdminActionType, string> = {
    password_reset: t.adminActionPasswordReset,
    user_delete: t.adminActionUserDelete,
    role_change: t.adminActionRoleChange,
    data_export: t.adminActionDataExport,
    lecture_create: "Lecture Create",
    lecture_update: "Lecture Update",
    lecture_delete: "Lecture Delete",
    lecture_status_change: "Lecture Status Change",
  };

  const filtered = useMemo(() => {
    let data = [...entries];
    if (actionFilter) {
      data = data.filter((e) => e.action === actionFilter);
    }
    if (searchFilter) {
      const q = searchFilter.toLowerCase();
      data = data.filter(
        (e) =>
          e.adminEmail.toLowerCase().includes(q) ||
          e.targetEmail.toLowerCase().includes(q),
      );
    }
    return data;
  }, [entries, actionFilter, searchFilter]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const pageRows = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  if (loading) return <div className="audit-empty">{t.loading}</div>;

  return (
    <div className="admin-audit">
      <h1>{t.adminAuditLog}</h1>

      <div className="audit-filters">
        <div className="audit-filter-group">
          <span className="audit-filter-label">{t.adminActionType}</span>
          <select
            className="audit-filter-input"
            value={actionFilter}
            onChange={(e) => { setActionFilter(e.target.value); setPage(0); }}
          >
            <option value="">{t.adminAll}</option>
            <option value="password_reset">{t.adminActionPasswordReset}</option>
            <option value="user_delete">{t.adminActionUserDelete}</option>
            <option value="role_change">{t.adminActionRoleChange}</option>
          </select>
        </div>
        <div className="audit-filter-group">
          <span className="audit-filter-label">{t.adminSearchUser}</span>
          <input
            type="text"
            className="audit-filter-input"
            placeholder={t.adminSearchPlaceholder}
            value={searchFilter}
            onChange={(e) => { setSearchFilter(e.target.value); setPage(0); }}
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="audit-empty">{t.adminNoAuditEntries}</div>
      ) : (
        <>
          <div className="audit-table-wrapper">
            <table className="audit-table">
              <thead>
                <tr>
                  <th>{t.adminDate}</th>
                  <th>{t.adminAuditAdmin}</th>
                  <th>{t.adminActionType}</th>
                  <th>{t.adminAuditTarget}</th>
                  <th>{t.adminAuditDetails}</th>
                </tr>
              </thead>
              <tbody>
                {pageRows.map((e) => (
                  <tr key={e.id}>
                    <td>
                      {e.timestamp
                        ? new Date(e.timestamp.seconds * 1000).toLocaleString()
                        : "—"}
                    </td>
                    <td>{e.adminEmail}</td>
                    <td>
                      <span className={`audit-action-badge audit-action-${e.action}`}>
                        {actionLabels[e.action] || e.action}
                      </span>
                    </td>
                    <td>{e.targetEmail}</td>
                    <td>{e.details || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="audit-pagination">
            <span className="audit-pagination-info">
              {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, filtered.length)} / {filtered.length}
            </span>
            <div className="audit-pagination-buttons">
              <button className="audit-page-btn" disabled={page === 0} onClick={() => setPage(page - 1)}>←</button>
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                const p = page < 3 ? i : page - 2 + i;
                if (p >= totalPages) return null;
                return (
                  <button key={p} className={`audit-page-btn${p === page ? " active" : ""}`} onClick={() => setPage(p)}>
                    {p + 1}
                  </button>
                );
              })}
              <button className="audit-page-btn" disabled={page >= totalPages - 1} onClick={() => setPage(page + 1)}>→</button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default AdminAuditPage;
