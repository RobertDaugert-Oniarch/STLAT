import { useEffect, useState, useMemo, useCallback } from "react";
import { useLang } from "../../context/LangContext";
import {
  subscribeToAllUsers,
  subscribeToAllTestResults,
  subscribeToGuestDemographics,
  type QuizResultDoc,
  type GuestDemographicDoc,
} from "../../services/adminDataService";
import { getLevel, type Level } from "../../utils/profileHelpers";
import { exportToCSV, exportToExcel } from "../../utils/exportData";
import { logAdminAction } from "../../services/auditLogService";
import { countries } from "../../data/countries";
import type { UserDoc } from "../../types/user";
import { FileDown, FileSpreadsheet } from "lucide-react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
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
  isAnonymous?: boolean;
  ageGroup: string;
  country: string;
  gender: string;
  education: string;
  employment: string;
}

type SortKey = keyof RowData;

const AdminStatisticsPage = () => {
  const { t, lang } = useLang();
  const [users, setUsers] = useState<(UserDoc & { uid: string })[]>([]);
  const [results, setResults] = useState<QuizResultDoc[]>([]);
  const [guestDemos, setGuestDemos] = useState<GuestDemographicDoc[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [dateFrom, setDateFrom] = useState<Date | null>(null);
  const [dateTo, setDateTo] = useState<Date | null>(null);
  const [categoryFilter, setCategoryFilter] = useState("");
  const [scoreMin, setScoreMin] = useState("");
  const [scoreMax, setScoreMax] = useState("");
  const [levelFilter, setLevelFilter] = useState("");
  const [userSearch, setUserSearch] = useState("");

  // Demographic filters
  const [ageGroupFilter, setAgeGroupFilter] = useState("");
  const [countryFilter, setCountryFilter] = useState("");
  const [genderFilter, setGenderFilter] = useState("");
  const [educationFilter, setEducationFilter] = useState("");
  const [employmentFilter, setEmploymentFilter] = useState("");

  // Sort
  const [sortKey, setSortKey] = useState<SortKey>("dateTs");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  // Pagination
  const [page, setPage] = useState(0);

  useEffect(() => {
    let loaded = { users: false, results: false, guestDemos: false };
    const check = () => { if (loaded.users && loaded.results && loaded.guestDemos) setLoading(false); };

    const unsub1 = subscribeToAllUsers((u) => { setUsers(u); loaded.users = true; check(); });
    const unsub2 = subscribeToAllTestResults((r) => { setResults(r); loaded.results = true; check(); });
    const unsub3 = subscribeToGuestDemographics((d) => { setGuestDemos(d); loaded.guestDemos = true; check(); });

    return () => { unsub1(); unsub2(); unsub3(); };
  }, []);

  const userMap = useMemo(() => {
    const m = new Map<string, { username: string; email: string; ageGroup: string; country: string; gender: string; education: string; employment: string }>();
    for (const u of users) {
      m.set(u.uid, {
        username: u.fullUsername || "",
        email: u.email || "",
        ageGroup: u.ageGroup || "",
        country: u.country || "",
        gender: u.gender || "",
        education: u.education || "",
        employment: u.employment || "",
      });
    }
    return m;
  }, [users]);

  const guestDemoMap = useMemo(() => {
    const m = new Map<string, GuestDemographicDoc>();
    for (const d of guestDemos) m.set(d.uid, d);
    return m;
  }, [guestDemos]);

  // Build rows
  const rows = useMemo((): RowData[] => {
    return results.map((r) => {
      const info = userMap.get(r.uid);
      const isAnon = r.isAnonymous === true;
      const cat = r.categoryResults || {};
      const getPerc = (key: string) => cat[key]?.percentage ?? 0;
      const ts = r.completedAt?.seconds ?? 0;
      return {
        uid: r.uid,
        username: isAnon ? t.adminAnonymous : (info?.username || r.uid),
        email: isAnon ? "—" : (info?.email || ""),
        date: ts ? new Date(ts * 1000).toLocaleDateString() : "—",
        dateTs: ts,
        overall: r.percentage || 0,
        knowledge: getPerc("Knowledge"),
        attitudes: getPerc("Attitudes"),
        behaviour: getPerc("Behaviour"),
        confidence: getPerc("Confidence in One's Judgement"),
        level: getLevel(r.percentage || 0),
        isAnonymous: isAnon,
        ageGroup: info?.ageGroup || guestDemoMap.get(r.uid)?.age || "",
        country: info?.country || guestDemoMap.get(r.uid)?.country || "",
        gender: info?.gender || guestDemoMap.get(r.uid)?.gender || "",
        education: info?.education || guestDemoMap.get(r.uid)?.education || "",
        employment: info?.employment || guestDemoMap.get(r.uid)?.occupation || "",
      };
    });
  }, [results, userMap, guestDemoMap, t.adminAnonymous]);

  // Apply filters
  const filtered = useMemo(() => {
    let data = [...rows];

    if (dateFrom) {
      const ts = dateFrom.getTime() / 1000;
      data = data.filter((r) => r.dateTs >= ts);
    }
    if (dateTo) {
      const ts = dateTo.getTime() / 1000 + 86400;
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

    // Demographic filters
    if (ageGroupFilter) data = data.filter((r) => r.ageGroup === ageGroupFilter);
    if (countryFilter) data = data.filter((r) => r.country === countryFilter);
    if (genderFilter) data = data.filter((r) => r.gender === genderFilter);
    if (educationFilter) data = data.filter((r) => r.education === educationFilter);
    if (employmentFilter) data = data.filter((r) => r.employment === employmentFilter);

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
  }, [rows, dateFrom, dateTo, scoreMin, scoreMax, levelFilter, userSearch, categoryFilter, sortKey, sortDir, ageGroupFilter, countryFilter, genderFilter, educationFilter, employmentFilter]);

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
    setDateFrom(null);
    setDateTo(null);
    setCategoryFilter("");
    setScoreMin("");
    setScoreMax("");
    setLevelFilter("");
    setUserSearch("");
    setAgeGroupFilter("");
    setCountryFilter("");
    setGenderFilter("");
    setEducationFilter("");
    setEmploymentFilter("");
    setPage(0);
  };

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

  const countryMap = useMemo(() => {
    const m = new Map<string, string>();
    for (const c of countries) m.set(c.code, lang === "lv" ? c.lv : c.en);
    return m;
  }, [lang]);

  const demoLabel = useCallback((value: string, type: "age" | "country" | "gender" | "education" | "employment") => {
    if (!value || value === "prefer_not_to_say" || value === "preferNotToSay") return t.preferNotToSay;
    const map: Record<string, Record<string, string>> = {
      age: {
        under_16: t.ageGroupUnder16, "16_18": t.ageGroup16to18, "19_25": t.ageGroup19to25, "26_35": t.ageGroup26to35, "36_50": t.ageGroup36to50, over_50: t.ageGroupOver50,
        // Guest demographic values
        under18: t.demoAgeUnder18, "18-24": t.demoAge1824, "25-34": t.demoAge2534, "35-44": t.demoAge3544, "45-54": t.demoAge4554, "55+": t.demoAge55,
      },
      gender: {
        male: t.genderMale, female: t.genderFemale,
        other: t.demoGenderOther,
      },
      education: {
        primary: t.educationPrimary, secondary: t.educationSecondary, professional: t.educationProfessional, higher: t.educationHigher, bachelor: t.educationBachelor, master: t.educationMaster,
        // Guest demographic values
        highSchool: t.demoEduHighSchool, bachelors: t.demoEduBachelors, masters: t.demoEduMasters, doctorate: t.demoEduDoctorate, other: t.demoEduOther,
      },
      employment: {
        school_student: t.employmentSchoolStudent, student: t.employmentStudent, employed: t.employmentEmployed, self_employed: t.employmentSelfEmployed, unemployed: t.employmentUnemployed, retired: t.employmentRetired,
        // Guest demographic values
        selfEmployed: t.demoOccSelfEmployed, other: t.demoOccOther,
      },
      country: {},
    };
    if (type === "country") return countryMap.get(value) || value;
    return map[type]?.[value] || value;
  }, [t, countryMap]);

  // Unique countries present in data for filter dropdown
  const activeCountries = useMemo(() => {
    const codes = new Set<string>();
    for (const r of rows) if (r.country && r.country !== "prefer_not_to_say") codes.add(r.country);
    return Array.from(codes)
      .map((code) => ({ code, label: countryMap.get(code) || code }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [rows, countryMap]);

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
      [t.profileSetupAgeGroup]: demoLabel(r.ageGroup, "age"),
      [t.profileSetupCountry]: demoLabel(r.country, "country"),
      [t.profileSetupGender]: demoLabel(r.gender, "gender"),
      [t.profileSetupEducation]: demoLabel(r.education, "education"),
      [t.profileSetupEmployment]: demoLabel(r.employment, "employment"),
    }));
    exportToCSV(data, "stlat-statistics");
    logAdminAction({
      action: "data_export",
      targetUid: "",
      targetEmail: "",
      details: `CSV export: ${data.length} rows`,
    });
  }, [filtered, t, demoLabel]);

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
      [t.profileSetupAgeGroup]: demoLabel(r.ageGroup, "age"),
      [t.profileSetupCountry]: demoLabel(r.country, "country"),
      [t.profileSetupGender]: demoLabel(r.gender, "gender"),
      [t.profileSetupEducation]: demoLabel(r.education, "education"),
      [t.profileSetupEmployment]: demoLabel(r.employment, "employment"),
    }));
    exportToExcel(data, "stlat-statistics");
    logAdminAction({
      action: "data_export",
      targetUid: "",
      targetEmail: "",
      details: `Excel export: ${data.length} rows`,
    });
  }, [filtered, t, demoLabel]);

  if (loading) return <div className="stats-empty">{t.loading}</div>;

  return (
    <div className="admin-statistics">
      <h1>{t.adminStatistics}</h1>

      {/* Filters */}
      <div className="stats-filters">
        <div className="stats-filter-group">
          <span className="stats-filter-label">{t.adminDateFrom}</span>
          <DatePicker
            selected={dateFrom}
            onChange={(d: Date | null) => { setDateFrom(d); setPage(0); }}
            dateFormat="dd.MM.yyyy"
            placeholderText="DD.MM.YYYY"
            className="stats-filter-input"
            isClearable
            maxDate={dateTo || undefined}
            portalId="datepicker-portal"
          />
        </div>
        <div className="stats-filter-group">
          <span className="stats-filter-label">{t.adminDateTo}</span>
          <DatePicker
            selected={dateTo}
            onChange={(d: Date | null) => { setDateTo(d); setPage(0); }}
            dateFormat="dd.MM.yyyy"
            placeholderText="DD.MM.YYYY"
            className="stats-filter-input"
            isClearable
            minDate={dateFrom || undefined}
            portalId="datepicker-portal"
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
              style={{ width: "50%" }}
            />
            <input
              type="number"
              className="stats-filter-input"
              placeholder="Max"
              value={scoreMax}
              min={0}
              max={100}
              onChange={(e) => { setScoreMax(e.target.value); setPage(0); }}
              style={{ width: "50%" }}
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
        <div className="stats-filter-group stats-filter-group--wide">
          <span className="stats-filter-label">{t.adminSearchUser}</span>
          <input
            type="text"
            className="stats-filter-input"
            placeholder={t.adminSearchPlaceholder}
            value={userSearch}
            onChange={(e) => { setUserSearch(e.target.value); setPage(0); }}
          />
        </div>
        <div className="stats-filter-group">
          <span className="stats-filter-label">{t.profileSetupAgeGroup}</span>
          <select className="stats-filter-input" value={ageGroupFilter} onChange={(e) => { setAgeGroupFilter(e.target.value); setPage(0); }}>
            <option value="">{t.adminAll}</option>
            <option value="under_16">{t.ageGroupUnder16}</option>
            <option value="16_18">{t.ageGroup16to18}</option>
            <option value="19_25">{t.ageGroup19to25}</option>
            <option value="26_35">{t.ageGroup26to35}</option>
            <option value="36_50">{t.ageGroup36to50}</option>
            <option value="over_50">{t.ageGroupOver50}</option>
            <option value="prefer_not_to_say">{t.preferNotToSay}</option>
          </select>
        </div>
        <div className="stats-filter-group">
          <span className="stats-filter-label">{t.profileSetupCountry}</span>
          <select className="stats-filter-input" value={countryFilter} onChange={(e) => { setCountryFilter(e.target.value); setPage(0); }}>
            <option value="">{t.adminAll}</option>
            <option value="prefer_not_to_say">{t.preferNotToSay}</option>
            {activeCountries.map((c) => (
              <option key={c.code} value={c.code}>{c.label}</option>
            ))}
          </select>
        </div>
        <div className="stats-filter-group">
          <span className="stats-filter-label">{t.profileSetupGender}</span>
          <select className="stats-filter-input" value={genderFilter} onChange={(e) => { setGenderFilter(e.target.value); setPage(0); }}>
            <option value="">{t.adminAll}</option>
            <option value="male">{t.genderMale}</option>
            <option value="female">{t.genderFemale}</option>
            <option value="prefer_not_to_say">{t.preferNotToSay}</option>
          </select>
        </div>
        <div className="stats-filter-group">
          <span className="stats-filter-label">{t.profileSetupEducation}</span>
          <select className="stats-filter-input" value={educationFilter} onChange={(e) => { setEducationFilter(e.target.value); setPage(0); }}>
            <option value="">{t.adminAll}</option>
            <option value="primary">{t.educationPrimary}</option>
            <option value="secondary">{t.educationSecondary}</option>
            <option value="professional">{t.educationProfessional}</option>
            <option value="higher">{t.educationHigher}</option>
            <option value="bachelor">{t.educationBachelor}</option>
            <option value="master">{t.educationMaster}</option>
            <option value="prefer_not_to_say">{t.preferNotToSay}</option>
          </select>
        </div>
        <div className="stats-filter-group">
          <span className="stats-filter-label">{t.profileSetupEmployment}</span>
          <select className="stats-filter-input" value={employmentFilter} onChange={(e) => { setEmploymentFilter(e.target.value); setPage(0); }}>
            <option value="">{t.adminAll}</option>
            <option value="school_student">{t.employmentSchoolStudent}</option>
            <option value="student">{t.employmentStudent}</option>
            <option value="employed">{t.employmentEmployed}</option>
            <option value="self_employed">{t.employmentSelfEmployed}</option>
            <option value="unemployed">{t.employmentUnemployed}</option>
            <option value="retired">{t.employmentRetired}</option>
            <option value="prefer_not_to_say">{t.preferNotToSay}</option>
          </select>
        </div>
        <div className="stats-filter-actions">
          <button className="stats-btn" onClick={resetFilters}>{t.adminReset}</button>
        </div>
      </div>

      {/* Export + summary row */}
      <div className="stats-summary-row">
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
                  <th onClick={() => handleSort("ageGroup")}>
                    {t.profileSetupAgeGroup} <span className="sort-arrow">{sortArrow("ageGroup")}</span>
                  </th>
                  <th onClick={() => handleSort("country")}>
                    {t.profileSetupCountry} <span className="sort-arrow">{sortArrow("country")}</span>
                  </th>
                  <th onClick={() => handleSort("gender")}>
                    {t.profileSetupGender} <span className="sort-arrow">{sortArrow("gender")}</span>
                  </th>
                  <th onClick={() => handleSort("education")}>
                    {t.profileSetupEducation} <span className="sort-arrow">{sortArrow("education")}</span>
                  </th>
                  <th onClick={() => handleSort("employment")}>
                    {t.profileSetupEmployment} <span className="sort-arrow">{sortArrow("employment")}</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {pageRows.map((r) => (
                  <tr key={r.uid}>
                    <td>{r.username}{r.isAnonymous && <span className="anon-badge">{t.adminAnonymous}</span>}</td>
                    <td>{r.email}</td>
                    <td>{r.date}</td>
                    <td>{r.overall}%</td>
                    <td>{r.knowledge}%</td>
                    <td>{r.attitudes}%</td>
                    <td>{r.behaviour}%</td>
                    <td>{r.confidence}%</td>
                    <td>{levelLabelMap[r.level] || r.level}</td>
                    <td>{demoLabel(r.ageGroup, "age")}</td>
                    <td>{demoLabel(r.country, "country")}</td>
                    <td>{demoLabel(r.gender, "gender")}</td>
                    <td>{demoLabel(r.education, "education")}</td>
                    <td>{demoLabel(r.employment, "employment")}</td>
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
