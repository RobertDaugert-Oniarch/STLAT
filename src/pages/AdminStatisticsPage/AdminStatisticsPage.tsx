import { useEffect, useState, useMemo, useCallback } from "react";
import { useLang } from "../../context/LangContext";
import {
  subscribeToAllUsers,
  subscribeToAllTestResults,
  type QuizResultDoc,
} from "../../services/adminDataService";
import { getLevel, type Level } from "../../utils/profileHelpers";
import { exportToCSV, exportToExcel } from "../../utils/exportData";
import { logAdminAction } from "../../services/auditLogService";
import type { UserDoc } from "../../types/user";
import { FileDown, FileSpreadsheet } from "lucide-react";
import "./AdminStatisticsPage.css";

const PAGE_SIZE = 20;

interface RowData {
  uid: string;
  username: string;
  email: string;
  date: string;
  dateTs: number;
  overall: number;
  knowledge: number;
  attitudes: number;
  behaviour: number;
  confidence: number;
  level: Level;
}

type SortKey = keyof RowData;

const AdminStatisticsPage = () => {
  const { t } = useLang();
  const [users, setUsers] = useState<(UserDoc & { uid: string })[]>([]);
  const [results, setResults] = useState<QuizResultDoc[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [scoreMin, setScoreMin] = useState("");
  const [scoreMax, setScoreMax] = useState("");
  const [levelFilter, setLevelFilter] = useState("");
  const [userSearch, setUserSearch] = useState("");

  // Sort
  const [sortKey, setSortKey] = useState<SortKey>("dateTs");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  // Pagination
  const [page, setPage] = useState(0);

  useEffect(() => {
    let loaded = { users: false, results: false };
    const check = () => { if (loaded.users && loaded.results) setLoading(false); };

    const unsub1 = subscribeToAllUsers((u) => { setUsers(u); loaded.users = true; check(); });
    const unsub2 = subscribeToAllTestResults((r) => { setResults(r); loaded.results = true; check(); });

    return () => { unsub1(); unsub2(); };
  }, []);

  const userMap = useMemo(() => {
    const m = new Map<string, { username: string; email: string }>();
    for (const u of users) {
      m.set(u.uid, { username: u.fullUsername || "", email: u.email || "" });
    }
    return m;
  }, [users]);

  // Build rows
  const rows = useMemo((): RowData[] => {
    return results.map((r) => {
      const info = userMap.get(r.uid);
      const cat = r.categoryResults || {};
      const getPerc = (key: string) => cat[key]?.percentage ?? 0;
      const ts = r.completedAt?.seconds ?? 0;
      return {
        uid: r.uid,
        username: info?.username || r.uid,
        email: info?.email || "",
        date: ts ? new Date(ts * 1000).toLocaleDateString() : "—",
        dateTs: ts,
        overall: r.percentage || 0,
        knowledge: getPerc("Knowledge"),
        attitudes: getPerc("Attitudes"),
        behaviour: getPerc("Behaviour"),
        confidence: getPerc("Confidence in One's Judgement"),
        level: getLevel(r.percentage || 0),
      };
    });
  }, [results, userMap]);

  // Apply filters
  const filtered = useMemo(() => {
    let data = [...rows];

    if (dateFrom) {
      const ts = new Date(dateFrom).getTime() / 1000;
      data = data.filter((r) => r.dateTs >= ts);
    }
    if (dateTo) {
      const ts = new Date(dateTo).getTime() / 1000 + 86400;
      data = data.filter((r) => r.dateTs <= ts);
    }
    if (scoreMin) {
      const min = Number(scoreMin);
      data = data.filter((r) => r.overall >= min);
    }
    if (scoreMax) {
      const max = Number(scoreMax);
      data = data.filter((r) => r.overall <= max);
    }
    if (levelFilter) {
      data = data.filter((r) => r.level === levelFilter);
    }
    if (userSearch) {
      const q = userSearch.toLowerCase();
      data = data.filter(
        (r) =>
          r.username.toLowerCase().includes(q) ||
          r.email.toLowerCase().includes(q),
      );
    }
    if (categoryFilter) {
      const key = categoryFilter as keyof RowData;
      data = data.filter((r) => {
        const val = r[key];
        return typeof val === "number" && val > 0;
      });
    }

    // Sort
    data.sort((a, b) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];
      if (typeof aVal === "number" && typeof bVal === "number") {
        return sortDir === "asc" ? aVal - bVal : bVal - aVal;
      }
      const aStr = String(aVal);
      const bStr = String(bVal);
      return sortDir === "asc" ? aStr.localeCompare(bStr) : bStr.localeCompare(aStr);
    });

    return data;
  }, [rows, dateFrom, dateTo, scoreMin, scoreMax, levelFilter, userSearch, categoryFilter, sortKey, sortDir]);

  // Pagination
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const pageRows = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  // Summary
  const avgOverall = filtered.length > 0
    ? Math.round(filtered.reduce((s, r) => s + r.overall, 0) / filtered.length)
    : 0;
  const avgKnowledge = filtered.length > 0
    ? Math.round(filtered.reduce((s, r) => s + r.knowledge, 0) / filtered.length)
    : 0;
  const avgAttitudes = filtered.length > 0
    ? Math.round(filtered.reduce((s, r) => s + r.attitudes, 0) / filtered.length)
    : 0;
  const avgBehaviour = filtered.length > 0
    ? Math.round(filtered.reduce((s, r) => s + r.behaviour, 0) / filtered.length)
    : 0;
  const avgConfidence = filtered.length > 0
    ? Math.round(filtered.reduce((s, r) => s + r.confidence, 0) / filtered.length)
    : 0;

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
    setPage(0);
  };

  const resetFilters = () => {
    setDateFrom("");
    setDateTo("");
    setCategoryFilter("");
    setScoreMin("");
    setScoreMax("");
    setLevelFilter("");
    setUserSearch("");
    setPage(0);
  };

  const handleExportCSV = useCallback(() => {
    const data = filtered.map((r) => ({
      [t.username]: r.username,
      [t.email]: r.email,
      [t.adminDate]: r.date,
      [t.overallScore]: r.overall,
      [t.categoryKnowledge]: r.knowledge,
      [t.categoryAttitudes]: r.attitudes,
      [t.categoryBehaviour]: r.behaviour,
      [t.categoryConfidence]: r.confidence,
      [t.adminLevel]: r.level,
    }));
    exportToCSV(data, "stlat-statistics");
    logAdminAction({
      action: "data_export",
      targetUid: "",
      targetEmail: "",
      details: `CSV export: ${data.length} rows`,
    });
  }, [filtered, t]);

  const handleExportExcel = useCallback(() => {
    const data = filtered.map((r) => ({
      [t.username]: r.username,
      [t.email]: r.email,
      [t.adminDate]: r.date,
      [t.overallScore]: r.overall,
      [t.categoryKnowledge]: r.knowledge,
      [t.categoryAttitudes]: r.attitudes,
      [t.categoryBehaviour]: r.behaviour,
      [t.categoryConfidence]: r.confidence,
      [t.adminLevel]: r.level,
    }));
    exportToExcel(data, "stlat-statistics");
    logAdminAction({
      action: "data_export",
      targetUid: "",
      targetEmail: "",
      details: `Excel export: ${data.length} rows`,
    });
  }, [filtered, t]);

  const sortArrow = (key: SortKey) => {
    if (sortKey !== key) return "";
    return sortDir === "asc" ? "▲" : "▼";
  };

  const levels: Level[] = ["master", "expert", "advanced", "intermediate", "elementary", "beginner", "novice"];
  const levelLabelMap: Record<string, string> = {
    master: t.level_master,
    expert: t.level_expert,
    advanced: t.level_advanced,
    intermediate: t.level_intermediate,
    elementary: t.level_elementary,
    beginner: t.level_beginner,
    novice: t.level_novice,
  };

  if (loading) return <div className="stats-empty">{t.loading}</div>;

  return (
    <div className="admin-statistics">
      <h1>{t.adminStatistics}</h1>

      {/* Filters */}
      <div className="stats-filters">
        <div className="stats-filter-group">
          <span className="stats-filter-label">{t.adminDateFrom}</span>
          <input
            type="date"
            className="stats-filter-input"
            value={dateFrom}
            onChange={(e) => { setDateFrom(e.target.value); setPage(0); }}
          />
        </div>
        <div className="stats-filter-group">
          <span className="stats-filter-label">{t.adminDateTo}</span>
          <input
            type="date"
            className="stats-filter-input"
            value={dateTo}
            onChange={(e) => { setDateTo(e.target.value); setPage(0); }}
          />
        </div>
        <div className="stats-filter-group">
          <span className="stats-filter-label">{t.adminScoreRange}</span>
          <div style={{ display: "flex", gap: 4 }}>
            <input
              type="number"
              className="stats-filter-input"
              placeholder="Min"
              value={scoreMin}
              min={0}
              max={100}
              onChange={(e) => { setScoreMin(e.target.value); setPage(0); }}
              style={{ width: 60 }}
            />
            <input
              type="number"
              className="stats-filter-input"
              placeholder="Max"
              value={scoreMax}
              min={0}
              max={100}
              onChange={(e) => { setScoreMax(e.target.value); setPage(0); }}
              style={{ width: 60 }}
            />
          </div>
        </div>
        <div className="stats-filter-group">
          <span className="stats-filter-label">{t.adminLevel}</span>
          <select
            className="stats-filter-input"
            value={levelFilter}
            onChange={(e) => { setLevelFilter(e.target.value); setPage(0); }}
          >
            <option value="">{t.adminAll}</option>
            {levels.map((l) => (
              <option key={l} value={l}>{levelLabelMap[l]}</option>
            ))}
          </select>
        </div>
        <div className="stats-filter-group">
          <span className="stats-filter-label">{t.adminSearchUser}</span>
          <input
            type="text"
            className="stats-filter-input"
            placeholder={t.adminSearchPlaceholder}
            value={userSearch}
            onChange={(e) => { setUserSearch(e.target.value); setPage(0); }}
          />
        </div>
        <div className="stats-filter-actions">
          <button className="stats-btn" onClick={resetFilters}>{t.adminReset}</button>
        </div>
      </div>

      {/* Export + summary row */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
        <div className="stats-summary">
          <div className="stats-summary-item">
            <span className="stats-summary-label">{t.adminResults}</span>
            <span className="stats-summary-value">{filtered.length}</span>
          </div>
          <div className="stats-summary-item">
            <span className="stats-summary-label">{t.adminAvgScore}</span>
            <span className="stats-summary-value">{avgOverall}%</span>
          </div>
          <div className="stats-summary-item">
            <span className="stats-summary-label">{t.categoryKnowledge}</span>
            <span className="stats-summary-value">{avgKnowledge}%</span>
          </div>
          <div className="stats-summary-item">
            <span className="stats-summary-label">{t.categoryAttitudes}</span>
            <span className="stats-summary-value">{avgAttitudes}%</span>
          </div>
          <div className="stats-summary-item">
            <span className="stats-summary-label">{t.categoryBehaviour}</span>
            <span className="stats-summary-value">{avgBehaviour}%</span>
          </div>
          <div className="stats-summary-item">
            <span className="stats-summary-label">{t.categoryConfidence}</span>
            <span className="stats-summary-value">{avgConfidence}%</span>
          </div>
        </div>
        <div className="stats-export">
          <button className="stats-btn" onClick={handleExportCSV}><FileDown size={16} /> CSV</button>
          <button className="stats-btn" onClick={handleExportExcel}><FileSpreadsheet size={16} /> Excel</button>
        </div>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="stats-empty">{t.noTestResult}</div>
      ) : (
        <>
          <div className="stats-table-wrapper">
            <table className="stats-table">
              <thead>
                <tr>
                  <th onClick={() => handleSort("username")}>
                    {t.username} <span className="sort-arrow">{sortArrow("username")}</span>
                  </th>
                  <th onClick={() => handleSort("email")}>
                    {t.email} <span className="sort-arrow">{sortArrow("email")}</span>
                  </th>
                  <th onClick={() => handleSort("dateTs")}>
                    {t.adminDate} <span className="sort-arrow">{sortArrow("dateTs")}</span>
                  </th>
                  <th onClick={() => handleSort("overall")}>
                    {t.overallScore} <span className="sort-arrow">{sortArrow("overall")}</span>
                  </th>
                  <th onClick={() => handleSort("knowledge")}>
                    {t.categoryKnowledge} <span className="sort-arrow">{sortArrow("knowledge")}</span>
                  </th>
                  <th onClick={() => handleSort("attitudes")}>
                    {t.categoryAttitudes} <span className="sort-arrow">{sortArrow("attitudes")}</span>
                  </th>
                  <th onClick={() => handleSort("behaviour")}>
                    {t.categoryBehaviour} <span className="sort-arrow">{sortArrow("behaviour")}</span>
                  </th>
                  <th onClick={() => handleSort("confidence")}>
                    {t.categoryConfidence} <span className="sort-arrow">{sortArrow("confidence")}</span>
                  </th>
                  <th onClick={() => handleSort("level")}>
                    {t.adminLevel} <span className="sort-arrow">{sortArrow("level")}</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {pageRows.map((r) => (
                  <tr key={r.uid}>
                    <td>{r.username}</td>
                    <td>{r.email}</td>
                    <td>{r.date}</td>
                    <td>{r.overall}%</td>
                    <td>{r.knowledge}%</td>
                    <td>{r.attitudes}%</td>
                    <td>{r.behaviour}%</td>
                    <td>{r.confidence}%</td>
                    <td>{levelLabelMap[r.level] || r.level}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="stats-pagination">
            <span className="stats-pagination-info">
              {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, filtered.length)} / {filtered.length}
            </span>
            <div className="stats-pagination-buttons">
              <button
                className="stats-page-btn"
                disabled={page === 0}
                onClick={() => setPage(page - 1)}
              >
                ←
              </button>
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                const p = page < 3 ? i : page - 2 + i;
                if (p >= totalPages) return null;
                return (
                  <button
                    key={p}
                    className={`stats-page-btn${p === page ? " active" : ""}`}
                    onClick={() => setPage(p)}
                  >
                    {p + 1}
                  </button>
                );
              })}
              <button
                className="stats-page-btn"
                disabled={page >= totalPages - 1}
                onClick={() => setPage(page + 1)}
              >
                →
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default AdminStatisticsPage;
