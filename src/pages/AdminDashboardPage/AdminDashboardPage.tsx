import { useEffect, useState } from "react";
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";
import { Pie } from "react-chartjs-2";
import { useLang } from "../../context/LangContext";
import {
  subscribeToAllUsers,
  subscribeToAllTestResults,
  getRecentSessions,
  type QuizResultDoc,
  type SessionDoc,
} from "../../services/adminDataService";
import { getLevel } from "../../utils/profileHelpers";
import type { UserDoc } from "../../types/user";
import { Users, FileText, BarChart3, Flame } from "lucide-react";
import "./AdminDashboardPage.css";

ChartJS.register(ArcElement, Tooltip, Legend);

const AdminDashboardPage = () => {
  const { t } = useLang();
  const [users, setUsers] = useState<(UserDoc & { uid: string })[]>([]);
  const [results, setResults] = useState<QuizResultDoc[]>([]);
  const [recentSessions, setRecentSessions] = useState<(SessionDoc & { sessionId: string })[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let loaded = { users: false, results: false };
    const checkDone = () => {
      if (loaded.users && loaded.results) setLoading(false);
    };

    const unsubUsers = subscribeToAllUsers((u) => {
      setUsers(u);
      loaded.users = true;
      checkDone();
    });

    const unsubResults = subscribeToAllTestResults((r) => {
      setResults(r);
      loaded.results = true;
      checkDone();
    });

    getRecentSessions(10).then(setRecentSessions);

    return () => {
      unsubUsers();
      unsubResults();
    };
  }, []);

  // Compute stats
  const totalUsers = users.filter((u) => !u.disabled).length;
  const totalTests = results.length;
  const avgScore = totalTests > 0
    ? Math.round(results.reduce((sum, r) => sum + (r.percentage || 0), 0) / totalTests)
    : 0;

  // Today's active (users who have a result with completedAt today)
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayTs = todayStart.getTime() / 1000;
  const activeToday = results.filter(
    (r) => r.completedAt && r.completedAt.seconds >= todayTs,
  ).length;

  // Level distribution for pie chart
  const levelCounts: Record<string, number> = {};
  for (const r of results) {
    const lvl = getLevel(r.percentage || 0);
    levelCounts[lvl] = (levelCounts[lvl] || 0) + 1;
  }

  const levelLabels = [
    { key: "master", label: t.level_master, color: "#6c5ce7" },
    { key: "expert", label: t.level_expert, color: "#0984e3" },
    { key: "advanced", label: t.level_advanced, color: "#00b894" },
    { key: "intermediate", label: t.level_intermediate, color: "#fdcb6e" },
    { key: "elementary", label: t.level_elementary, color: "#e17055" },
    { key: "beginner", label: t.level_beginner, color: "#d63031" },
    { key: "novice", label: t.level_novice, color: "#b2bec3" },
  ];

  const levelChartData = {
    labels: levelLabels.map((l) => l.label),
    datasets: [
      {
        data: levelLabels.map((l) => levelCounts[l.key] || 0),
        backgroundColor: levelLabels.map((l) => l.color),
        borderWidth: 0,
      },
    ],
  };

  // Category avg for pie chart
  const categoryKeys = [
    { key: "Knowledge", label: t.categoryKnowledge, color: "#0984e3" },
    { key: "Attitudes", label: t.categoryAttitudes, color: "#00b894" },
    { key: "Behaviour", label: t.categoryBehaviour, color: "#fdcb6e" },
    { key: "Confidence in One's Judgement", label: t.categoryConfidence, color: "#e17055" },
  ];

  const categoryAvgs: Record<string, { sum: number; count: number }> = {};
  for (const r of results) {
    if (!r.categoryResults) continue;
    for (const [cat, stats] of Object.entries(r.categoryResults)) {
      if (!categoryAvgs[cat]) categoryAvgs[cat] = { sum: 0, count: 0 };
      categoryAvgs[cat].sum += stats.percentage;
      categoryAvgs[cat].count++;
    }
  }

  const categoryChartData = {
    labels: categoryKeys.map((c) => c.label),
    datasets: [
      {
        data: categoryKeys.map((c) => {
          const avg = categoryAvgs[c.key];
          return avg ? Math.round(avg.sum / avg.count) : 0;
        }),
        backgroundColor: categoryKeys.map((c) => c.color),
        borderWidth: 0,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: "bottom" as const,
        labels: {
          color: getComputedStyle(document.documentElement)
            .getPropertyValue("--text")
            .trim() || "#333",
          padding: 12,
        },
      },
    },
  };

  // Build username lookup from users
  const userMap = new Map(users.map((u) => [u.uid, u.fullUsername || u.email || u.uid]));

  if (loading) {
    return <div className="dashboard-empty">{t.loading}</div>;
  }

  return (
    <div className="admin-dashboard">
      <h1>{t.adminDashboard}</h1>

      {/* Summary cards */}
      <div className="dashboard-cards">
        <div className="dashboard-card">
          <span className="dashboard-card-icon"><Users size={22} /></span>
          <span className="dashboard-card-value">{totalUsers}</span>
          <span className="dashboard-card-label">{t.adminTotalUsers}</span>
        </div>
        <div className="dashboard-card">
          <span className="dashboard-card-icon"><FileText size={22} /></span>
          <span className="dashboard-card-value">{totalTests}</span>
          <span className="dashboard-card-label">{t.adminTotalTests}</span>
        </div>
        <div className="dashboard-card">
          <span className="dashboard-card-icon"><BarChart3 size={22} /></span>
          <span className="dashboard-card-value">{avgScore}%</span>
          <span className="dashboard-card-label">{t.adminAvgScore}</span>
        </div>
        <div className="dashboard-card">
          <span className="dashboard-card-icon"><Flame size={22} /></span>
          <span className="dashboard-card-value">{activeToday}</span>
          <span className="dashboard-card-label">{t.adminActiveToday}</span>
        </div>
      </div>

      {/* Pie charts */}
      <div className="dashboard-charts">
        <div className="dashboard-chart-card">
          <h3>{t.adminLevelDistribution}</h3>
          <div className="dashboard-chart-wrapper">
            <Pie data={levelChartData} options={chartOptions} />
          </div>
        </div>
        <div className="dashboard-chart-card">
          <h3>{t.adminCategoryPerformance}</h3>
          <div className="dashboard-chart-wrapper">
            <Pie data={categoryChartData} options={chartOptions} />
          </div>
        </div>
      </div>

      {/* Recent activity */}
      <div className="dashboard-recent">
        <h3>{t.adminRecentActivity}</h3>
        {recentSessions.length === 0 ? (
          <p className="dashboard-empty">{t.noTestResult}</p>
        ) : (
          <ul className="dashboard-recent-list">
            {recentSessions.map((s, i) => (
              <li key={s.sessionId || i} className="dashboard-recent-item">
                <span className="dashboard-recent-user">
                  {s.userId ? (userMap.get(s.userId) || s.userId) : "—"}
                </span>
                <span className="dashboard-recent-score">
                  {Math.round(s.overallPercentage)}%
                </span>
                <span className="dashboard-recent-date">
                  {s.completedAt
                    ? new Date(s.completedAt.seconds * 1000).toLocaleDateString()
                    : "—"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default AdminDashboardPage;
