import { useEffect, useState, useMemo } from "react";
import { useLang } from "../../context/LangContext";
import {
  subscribeToAllLectures,
  deleteLecture,
  toggleLectureStatus,
  type LectureWithId,
} from "../../services/adminLectureService";
import ConfirmModal from "../../components/ConfirmModal/ConfirmModal";
import LectureEditor from "../../components/LectureEditor/LectureEditor";
import { Plus, Pencil, Trash2, Eye, EyeOff, ExternalLink } from "lucide-react";
import type { TestCategory } from "../../types/test";
import "./AdminLecturesPage.css";

const PAGE_SIZE = 20;

const CATEGORIES: TestCategory[] = [
  "Knowledge",
  "Attitudes",
  "Behaviour",
  "Confidence in One's Judgement",
];

function getStatusLabel(lecture: LectureWithId): "published" | "draft" | "scheduled" {
  if (lecture.status !== "published") return "draft";
  if (lecture.publishAt) {
    const ts = lecture.publishAt as { seconds: number };
    if (ts.seconds && ts.seconds * 1000 > Date.now()) return "scheduled";
  }
  return "published";
}

function formatDate(ts: unknown): string {
  if (!ts) return "—";
  const t = ts as { seconds: number };
  if (!t.seconds) return "—";
  return new Date(t.seconds * 1000).toLocaleDateString();
}

const AdminLecturesPage = () => {
  const { t } = useLang();
  const [lectures, setLectures] = useState<LectureWithId[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterLang, setFilterLang] = useState("");
  const [page, setPage] = useState(0);
  const [toast, setToast] = useState<string | null>(null);

  // Modal state
  const [deleteModal, setDeleteModal] = useState<LectureWithId | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingLecture, setEditingLecture] = useState<LectureWithId | null>(null);

  useEffect(() => {
    const unsub = subscribeToAllLectures((data) => {
      setLectures(data);
      setLoading(false);
    });
    return unsub;
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(timer);
  }, [toast]);

  const filtered = useMemo(() => {
    let result = lectures;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (l) =>
          l.title.toLowerCase().includes(q) ||
          l.description.toLowerCase().includes(q),
      );
    }
    if (filterCategory) {
      result = result.filter((l) => l.category === filterCategory);
    }
    if (filterStatus) {
      result = result.filter((l) => {
        const s = getStatusLabel(l);
        return s === filterStatus;
      });
    }
    if (filterLang) {
      result = result.filter((l) => l.language === filterLang);
    }
    return result;
  }, [lectures, search, filterCategory, filterStatus, filterLang]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const pageData = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const handleDelete = async () => {
    if (!deleteModal) return;
    try {
      await deleteLecture(deleteModal.id);
      setToast(t.lectureDeleted);
    } catch {
      setToast(t.unexpectedError);
    }
    setDeleteModal(null);
  };

  const handleToggleStatus = async (lecture: LectureWithId) => {
    const newStatus = lecture.status === "published" ? "draft" : "published";
    try {
      await toggleLectureStatus(lecture.id, newStatus);
      setToast(
        newStatus === "published" ? t.lecturePublished : t.lectureDrafted,
      );
    } catch {
      setToast(t.unexpectedError);
    }
  };

  const handleEdit = (lecture: LectureWithId) => {
    setEditingLecture(lecture);
    setEditorOpen(true);
  };

  const handleCreate = () => {
    setEditingLecture(null);
    setEditorOpen(true);
  };

  const handleEditorClose = (saved?: boolean) => {
    setEditorOpen(false);
    setEditingLecture(null);
    if (saved) setToast(editingLecture ? t.lectureUpdated : t.lectureCreated);
  };

  if (loading) {
    return (
      <div className="admin-lectures">
        <p>{t.loading}</p>
      </div>
    );
  }

  return (
    <div className="admin-lectures">
      <div className="lectures-header">
        <h1>{t.adminLectures}</h1>
      </div>
      <button className="lectures-create-btn" onClick={handleCreate}>
        <Plus size={16} />
        {t.createLecture}
      </button>

      {/* Toolbar */}
      <div className="lectures-toolbar">
        <input
          className="lectures-search"
          type="text"
          placeholder={t.adminSearchPlaceholder}
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(0);
          }}
        />
        <select
          className="lectures-filter"
          value={filterCategory}
          onChange={(e) => {
            setFilterCategory(e.target.value);
            setPage(0);
          }}
        >
          <option value="">{t.adminAll} — {t.lectureCategory}</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <select
          className="lectures-filter"
          value={filterStatus}
          onChange={(e) => {
            setFilterStatus(e.target.value);
            setPage(0);
          }}
        >
          <option value="">{t.adminAll} — {t.lectureStatus}</option>
          <option value="published">{t.published}</option>
          <option value="draft">{t.draft}</option>
          <option value="scheduled">{t.scheduled}</option>
        </select>
        <select
          className="lectures-filter"
          value={filterLang}
          onChange={(e) => {
            setFilterLang(e.target.value);
            setPage(0);
          }}
        >
          <option value="">{t.adminAll} — {t.lectureLanguage}</option>
          <option value="en">English</option>
          <option value="lv">Latviešu</option>
        </select>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="lectures-empty">{t.noLectures}</div>
      ) : (
        <>
          <div className="lectures-table-wrapper">
            <table className="lectures-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>{t.lectureTitle}</th>
                  <th>{t.lectureCategory}</th>
                  <th>{t.lectureLanguage}</th>
                  <th>{t.lectureStatus}</th>
                  <th>{t.lectureSections}</th>
                  <th>{t.lectureRating}</th>
                  <th>{t.lectureVersion}</th>
                  <th>{t.adminDate}</th>
                  <th>{t.adminActions}</th>
                </tr>
              </thead>
              <tbody>
                {pageData.map((lecture) => {
                  const status = getStatusLabel(lecture);
                  return (
                    <tr key={lecture.id}>
                      <td>{lecture.order}</td>
                      <td>
                        <strong>{lecture.title}</strong>
                      </td>
                      <td>{lecture.category}</td>
                      <td>
                        <span className="lang-badge">{lecture.language}</span>
                      </td>
                      <td>
                        <span
                          className={`status-badge status-${status}`}
                        >
                          {status === "scheduled"
                            ? `${t.scheduled} ${formatDate(lecture.publishAt)}`
                            : t[status]}
                        </span>
                      </td>
                      <td>{lecture.sections.length}</td>
                      <td>
                        {lecture.avgRating ? (
                          <span className="lecture-rating">
                            <span className="lecture-rating-star">★</span>
                            {lecture.avgRating.toFixed(1)}
                            <span className="lecture-rating-count">
                              ({lecture.ratingCount || 0})
                            </span>
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td>v{lecture.version}</td>
                      <td>{formatDate(lecture.createdAt)}</td>
                      <td>
                        <div className="lecture-actions">
                          <button
                            className="lecture-action-btn"
                            onClick={() => handleEdit(lecture)}
                            title={t.editLecture}
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            className="lecture-action-btn"
                            onClick={() => handleToggleStatus(lecture)}
                            title={
                              lecture.status === "published"
                                ? t.draft
                                : t.published
                            }
                          >
                            {lecture.status === "published" ? (
                              <EyeOff size={14} />
                            ) : (
                              <Eye size={14} />
                            )}
                          </button>
                          <a
                            className="lecture-action-btn"
                            href={`/admin/lectures/preview/${lecture.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            title={t.previewLecture}
                          >
                            <ExternalLink size={14} />
                          </a>
                          <button
                            className="lecture-action-btn danger"
                            onClick={() => setDeleteModal(lecture)}
                            title={t.deleteLecture}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="lectures-pagination">
              <span className="lectures-pagination-info">
                {page * PAGE_SIZE + 1}–
                {Math.min((page + 1) * PAGE_SIZE, filtered.length)}{" "}
                / {filtered.length}
              </span>
              <div className="lectures-pagination-buttons">
                <button
                  className="lectures-page-btn"
                  disabled={page === 0}
                  onClick={() => setPage(page - 1)}
                >
                  ‹
                </button>
                {Array.from({ length: totalPages }, (_, i) => (
                  <button
                    key={i}
                    className={`lectures-page-btn${i === page ? " active" : ""}`}
                    onClick={() => setPage(i)}
                  >
                    {i + 1}
                  </button>
                ))}
                <button
                  className="lectures-page-btn"
                  disabled={page >= totalPages - 1}
                  onClick={() => setPage(page + 1)}
                >
                  ›
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Delete modal */}
      {deleteModal && (
        <ConfirmModal
          title={t.deleteLecture}
          message={t.confirmDeleteLecture}
          confirmLabel={t.deleteLecture}
          cancelLabel={t.cancel}
          onConfirm={handleDelete}
          onCancel={() => setDeleteModal(null)}
        />
      )}

      {/* Editor overlay */}
      {editorOpen && (
        <div className="lecture-editor-overlay">
          <LectureEditor
            lecture={editingLecture}
            onClose={handleEditorClose}
          />
        </div>
      )}

      {/* Toast */}
      {toast && <div className="lectures-toast">{toast}</div>}
    </div>
  );
};

export default AdminLecturesPage;
