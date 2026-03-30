import { useEffect, useState, useMemo, useCallback } from "react";
import { doc, updateDoc, deleteDoc, collection, getDocs } from "firebase/firestore";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth, db } from "../../firebase/config";
import { USERS, USERNAMES, QUIZ_RESULTS, TEST_HISTORY } from "../../firebase/collections";
import { useLang } from "../../context/LangContext";
import {
  subscribeToAllUsers,
  subscribeToAllTestResults,
  type QuizResultDoc,
} from "../../services/adminDataService";
import { logAdminAction } from "../../services/auditLogService";
import { getInitials } from "../../utils/profileHelpers";
import { generateUniqueUsername, formatUsername, reserveUsername } from "../../utils/generateUsername";
import type { UserDoc, UserRole } from "../../types/user";
import ConfirmModal from "../../components/ConfirmModal/ConfirmModal";
import RoleChangeModal from "../../components/RoleChangeModal/RoleChangeModal";
import { KeyRound, ShieldCheck, ShieldOff, Trash2 } from "lucide-react";
import "./AdminUsersPage.css";

const PAGE_SIZE = 20;

interface UserRow {
  uid: string;
  username: string;
  email: string;
  role: UserRole;
  disabled: boolean;
  lastActivity: string;
  lastActivityTs: number;
  testsCount: number;
  avgScore: number;
  initials: string;
}

const AdminUsersPage = () => {
  const { t } = useLang();
  const [users, setUsers] = useState<(UserDoc & { uid: string })[]>([]);
  const [results, setResults] = useState<QuizResultDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [toast, setToast] = useState<string | null>(null);

  // Modal state
  const [modal, setModal] = useState<{
    type: "delete" | "role";
    uid: string;
    email: string;
    fullUsername?: string;
    newRole?: UserRole;
  } | null>(null);

  useEffect(() => {
    let loaded = { users: false, results: false };
    const check = () => { if (loaded.users && loaded.results) setLoading(false); };

    const unsub1 = subscribeToAllUsers((u) => { setUsers(u); loaded.users = true; check(); });
    const unsub2 = subscribeToAllTestResults((r) => { setResults(r); loaded.results = true; check(); });

    return () => { unsub1(); unsub2(); };
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(timer);
  }, [toast]);

  const resultMap = useMemo(() => {
    const m = new Map<string, QuizResultDoc>();
    for (const r of results) m.set(r.uid, r);
    return m;
  }, [results]);

  const rows = useMemo((): UserRow[] => {
    return users.map((u) => {
      const result = resultMap.get(u.uid);
      const ts = result?.completedAt?.seconds ?? 0;
      return {
        uid: u.uid,
        username: u.fullUsername || "—",
        email: u.email || "—",
        role: u.role || "user",
        disabled: u.disabled || false,
        lastActivity: ts ? new Date(ts * 1000).toLocaleDateString() : "—",
        lastActivityTs: ts,
        testsCount: result ? 1 : 0, // latest result count
        avgScore: result?.percentage ?? 0,
        initials: getInitials(u.fullUsername || "??"),
      };
    });
  }, [users, resultMap]);

  const filtered = useMemo(() => {
    if (!search) return rows;
    const q = search.toLowerCase();
    return rows.filter(
      (r) => r.username.toLowerCase().includes(q) || r.email.toLowerCase().includes(q),
    );
  }, [rows, search]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const pageRows = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const showToast = (msg: string) => setToast(msg);

  const handleResetPassword = useCallback(async (uid: string, email: string) => {
    try {
      await sendPasswordResetEmail(auth, email);
      await logAdminAction({
        action: "password_reset",
        targetUid: uid,
        targetEmail: email,
      });
      showToast(t.resetSent);
    } catch (err) {
      console.error("Password reset failed:", err);
    }
  }, [t.resetSent]);

  const handleDeleteUser = useCallback(async () => {
    if (!modal || modal.type !== "delete") return;
    const { uid, email } = modal;
    setModal(null);

    try {
      // Clean up related data first
      const userDoc = users.find((u) => u.uid === uid);
      if (userDoc?.fullUsername) {
        try { await deleteDoc(doc(db, USERNAMES, userDoc.fullUsername)); } catch { /* ignore */ }
      }
      try { await deleteDoc(doc(db, QUIZ_RESULTS, uid)); } catch { /* ignore */ }
      // Delete test history subcollection
      try {
        const sessionsRef = collection(db, TEST_HISTORY, uid, "sessions");
        const snap = await getDocs(sessionsRef);
        for (const d of snap.docs) await deleteDoc(d.ref);
      } catch { /* ignore */ }
      // Delete user document (Firebase Auth account stays but login is blocked)
      await deleteDoc(doc(db, USERS, uid));

      await logAdminAction({
        action: "user_delete",
        targetUid: uid,
        targetEmail: email,
      });
      showToast(t.adminUserDeleted);
    } catch (err) {
      console.error("Delete user failed:", err);
    }
  }, [modal, users, t.adminUserDeleted]);

  const handleRoleChange = useCallback(async (firstName?: string, lastName?: string) => {
    if (!modal || modal.type !== "role" || !modal.newRole) return;
    const { uid, email, fullUsername: oldFullUsername, newRole } = modal;
    setModal(null);

    try {
      const updateData: Record<string, unknown> = { role: newRole };
      let details = `Changed role to ${newRole}`;

      // Delete old username reservation
      if (oldFullUsername) {
        try { await deleteDoc(doc(db, USERNAMES, oldFullUsername)); } catch { /* ignore */ }
      }

      if (newRole === "admin" && firstName && lastName) {
        // Promote: username becomes "FirstName LastName"
        const adminUsername = `${firstName} ${lastName}`;
        updateData.firstName = firstName;
        updateData.lastName = lastName;
        updateData.fullUsername = adminUsername;
        updateData.username = adminUsername;
        updateData.tag = "";
        await reserveUsername(adminUsername, uid);
        details += ` — ${firstName} ${lastName}`;
      } else if (newRole === "user") {
        // Demote: generate a new random username
        const { name, tag } = await generateUniqueUsername(uid);
        updateData.fullUsername = formatUsername(name, tag);
        updateData.username = name;
        updateData.tag = String(tag);
        updateData.firstName = "";
        updateData.lastName = "";
      }

      await updateDoc(doc(db, USERS, uid), updateData);
      await logAdminAction({
        action: "role_change",
        targetUid: uid,
        targetEmail: email,
        details,
      });
      showToast(t.adminRoleChanged);
    } catch (err) {
      console.error("Role change failed:", err);
    }
  }, [modal, t.adminRoleChanged]);

  if (loading) return <div className="users-empty">{t.loading}</div>;

  return (
    <div className="admin-users">
      <h1>{t.adminUsers}</h1>

      <div className="users-toolbar">
        <input
          type="text"
          className="users-search"
          placeholder={t.adminSearchPlaceholder}
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(0); }}
        />
      </div>

      {filtered.length === 0 ? (
        <div className="users-empty">{t.adminNoUsers}</div>
      ) : (
        <>
          <div className="users-table-wrapper">
            <table className="users-table">
              <thead>
                <tr>
                  <th>{t.username}</th>
                  <th>{t.email}</th>
                  <th>{t.adminRole}</th>
                  <th>{t.adminLastActivity}</th>
                  <th>{t.adminAvgScore}</th>
                  <th>{t.adminActions}</th>
                </tr>
              </thead>
              <tbody>
                {pageRows.map((r) => (
                  <tr key={r.uid}>
                    <td>
                      <div className="user-info-cell">
                        <div className="user-avatar">{r.initials}</div>
                        <span>{r.username}</span>
                      </div>
                    </td>
                    <td>{r.email}</td>
                    <td>
                      {r.disabled ? (
                        <span className="disabled-badge">{t.adminDisabled}</span>
                      ) : (
                        <span className={`role-badge role-${r.role}`}>
                          {r.role === "admin" ? t.adminRoleAdmin : t.adminRoleUser}
                        </span>
                      )}
                    </td>
                    <td>{r.lastActivity}</td>
                    <td>{r.avgScore > 0 ? `${r.avgScore}%` : "—"}</td>
                    <td>
                      <div className="user-actions">
                        <button
                          className="user-action-btn"
                          onClick={() => handleResetPassword(r.uid, r.email)}
                          title={t.adminResetPassword}
                          disabled={r.disabled}
                        >
                          <KeyRound size={16} />
                        </button>
                        <button
                          className="user-action-btn"
                          onClick={() =>
                            setModal({
                              type: "role",
                              uid: r.uid,
                              email: r.email,
                              fullUsername: r.username,
                              newRole: r.role === "admin" ? "user" : "admin",
                            })
                          }
                          title={r.role === "admin" ? t.adminDemote : t.adminPromote}
                          disabled={r.disabled}
                        >
                          {r.role === "admin" ? <ShieldOff size={16} /> : <ShieldCheck size={16} />}
                        </button>
                        <button
                          className="user-action-btn danger"
                          onClick={() =>
                            setModal({ type: "delete", uid: r.uid, email: r.email })
                          }
                          title={t.delete}
                          disabled={r.disabled}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="users-pagination">
            <span className="users-pagination-info">
              {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, filtered.length)} / {filtered.length}
            </span>
            <div className="users-pagination-buttons">
              <button className="users-page-btn" disabled={page === 0} onClick={() => setPage(page - 1)}>←</button>
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                const p = page < 3 ? i : page - 2 + i;
                if (p >= totalPages) return null;
                return (
                  <button key={p} className={`users-page-btn${p === page ? " active" : ""}`} onClick={() => setPage(p)}>
                    {p + 1}
                  </button>
                );
              })}
              <button className="users-page-btn" disabled={page >= totalPages - 1} onClick={() => setPage(page + 1)}>→</button>
            </div>
          </div>
        </>
      )}

      {/* Delete confirmation modal */}
      {modal?.type === "delete" && (
        <ConfirmModal
          title={t.adminDeleteUserTitle}
          message={t.adminDeleteUserMsg}
          confirmLabel={t.delete}
          cancelLabel={t.cancel}
          variant="danger"
          onConfirm={handleDeleteUser}
          onCancel={() => setModal(null)}
        />
      )}

      {/* Role change confirmation modal — promotion needs name fields */}
      {modal?.type === "role" && modal.newRole === "admin" && (
        <RoleChangeModal
          title={t.adminChangeRoleTitle}
          message={t.adminPromoteMsg}
          confirmLabel={t.confirm}
          cancelLabel={t.cancel}
          onConfirm={(firstName, lastName) => handleRoleChange(firstName, lastName)}
          onCancel={() => setModal(null)}
        />
      )}

      {/* Demotion uses simple confirm modal */}
      {modal?.type === "role" && modal.newRole === "user" && (
        <ConfirmModal
          title={t.adminChangeRoleTitle}
          message={t.adminDemoteMsg}
          confirmLabel={t.confirm}
          cancelLabel={t.cancel}
          variant="primary"
          onConfirm={() => handleRoleChange()}
          onCancel={() => setModal(null)}
        />
      )}

      {/* Toast notification */}
      {toast && <div className="users-toast">{toast}</div>}
    </div>
  );
};

export default AdminUsersPage;
