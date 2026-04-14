import { useState, useEffect } from "react";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { signOut } from "firebase/auth";
import { auth, db } from "../../firebase/config";
import { USERS } from "../../firebase/collections";
import { useAdminGuard } from "../../hooks/useAdminGuard";
import { useLang } from "../../context/LangContext";
import ThemeToggle from "../ThemeToggle/ThemeToggle";
import LangToggle from "../LangToggle/LangToggle";
import { LayoutDashboard, TrendingUp, Users, ClipboardList, LogOut, Menu, BookOpen } from "lucide-react";
import "./AdminLayout.css";

const AdminLayout = () => {
  const { user, loading } = useAdminGuard();
  const { t } = useLang();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [username, setUsername] = useState("");

  useEffect(() => {
    if (!user) return;
    getDoc(doc(db, USERS, user.uid)).then((snap) => {
      if (snap.exists()) {
        setUsername(snap.data().fullUsername || snap.data().email || "");
      }
    });
  }, [user]);

  if (loading) return <div className="admin-layout"><p>{t.loading}</p></div>;

  const handleSignOut = async () => {
    await signOut(auth);
    navigate("/login");
  };

  const navItems = [
    { to: "/admin", icon: <LayoutDashboard size={18} />, label: t.adminDashboard, end: true },
    { to: "/admin/lectures", icon: <BookOpen size={18} />, label: t.adminLectures, end: false },
    { to: "/admin/statistics", icon: <TrendingUp size={18} />, label: t.adminStatistics, end: false },
    { to: "/admin/users", icon: <Users size={18} />, label: t.adminUsers, end: false },
    { to: "/admin/audit", icon: <ClipboardList size={18} />, label: t.adminAuditLog, end: false },
  ];

  return (
    <div className="admin-layout">
      {/* Mobile overlay */}
      <div
        className={`admin-overlay${sidebarOpen ? " open" : ""}`}
        onClick={() => setSidebarOpen(false)}
      />

      {/* Sidebar */}
      <aside className={`admin-sidebar${sidebarOpen ? " open" : ""}`}>
        <div className="admin-sidebar-header">
          <Link to="/admin" className="admin-logo-link">
            <h2 className="admin-sidebar-title">STLAT</h2>
          </Link>
          <p className="admin-sidebar-subtitle">{t.adminPanel}</p>
        </div>

        <nav className="admin-sidebar-nav">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `admin-nav-item${isActive ? " active" : ""}`
              }
              onClick={() => setSidebarOpen(false)}
            >
              <span className="admin-nav-icon">{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="admin-sidebar-footer">
          <span className="admin-sidebar-user">{username}</span>
          <div className="admin-sidebar-controls">
            <ThemeToggle />
            <LangToggle />
            <button className="admin-nav-item" onClick={handleSignOut}>
              <span className="admin-nav-icon"><LogOut size={18} /></span>
              {t.signOut}
            </button>
          </div>
        </div>
      </aside>

      {/* Main area */}
      <div className="admin-main">
        <header className="admin-topbar">
          <button
            className="admin-hamburger"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            aria-label="Toggle menu"
          >
            <Menu size={22} />
          </button>
          <span className="admin-topbar-user">{username}</span>
        </header>

        <main className="admin-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
