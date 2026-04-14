import { useState, useRef, useEffect } from "react";
import { useLang } from "../../context/LangContext";
import {
  createLecture,
  updateLecture,
  getLectureVersions,
  type LectureWithId,
  type LectureFormData,
  type LectureVersionDoc,
} from "../../services/adminLectureService";
import {
  uploadLectureFile,
  validateLectureFile,
} from "../../services/fileUploadService";
import { convertFileToSections } from "../../services/fileConversionService";
import type { LectureSection } from "../../types/lecture";
import type { TestCategory } from "../../types/test";
import { Upload, Plus, ArrowUp, ArrowDown, Trash2, RotateCcw } from "lucide-react";
import "./LectureEditor.css";

interface Props {
  lecture: LectureWithId | null;
  onClose: (saved?: boolean) => void;
}

const CATEGORIES: TestCategory[] = [
  "Knowledge",
  "Attitudes",
  "Behaviour",
  "Confidence in One's Judgement",
];

let idCounter = 0;
function newSectionId(): string {
  idCounter += 1;
  return `sec-${Date.now()}-${idCounter}`;
}

const LectureEditor = ({ lecture, onClose }: Props) => {
  const { t } = useLang();
  const isEdit = !!lecture;

  // Form state
  const [title, setTitle] = useState(lecture?.title || "");
  const [description, setDescription] = useState(lecture?.description || "");
  const [category, setCategory] = useState<TestCategory>(
    lecture?.category || "Knowledge",
  );
  const [language, setLanguage] = useState<"en" | "lv">(
    lecture?.language || "en",
  );
  const [status, setStatus] = useState<"draft" | "published">(
    lecture?.status || "draft",
  );
  const [coverImage, setCoverImage] = useState(lecture?.coverImage || "");
  const [order, setOrder] = useState(lecture?.order || 1);
  const [sections, setSections] = useState<LectureSection[]>(
    lecture?.sections || [],
  );
  const [publishAt, setPublishAt] = useState<string>(() => {
    if (!lecture?.publishAt) return "";
    const ts = lecture.publishAt as { seconds: number };
    if (!ts.seconds) return "";
    const d = new Date(ts.seconds * 1000);
    return d.toISOString().slice(0, 16);
  });

  // UI state
  const [tab, setTab] = useState<"upload" | "manual" | "history">("manual");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [uploadStatus, setUploadStatus] = useState("");
  const [uploadError, setUploadError] = useState("");
  const [dragging, setDragging] = useState(false);
  const [versions, setVersions] = useState<LectureVersionDoc[]>([]);
  const [versionsLoaded, setVersionsLoaded] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [fileUrl, setFileUrl] = useState(lecture?.fileUrl || "");
  const [fileType, setFileType] = useState<LectureFormData["fileType"]>(
    lecture?.fileType || "manual",
  );

  // Load versions when switching to history tab
  useEffect(() => {
    if (tab === "history" && isEdit && !versionsLoaded) {
      getLectureVersions(lecture!.id).then((v) => {
        setVersions(v);
        setVersionsLoaded(true);
      });
    }
  }, [tab, isEdit, versionsLoaded, lecture]);

  // ── File upload handling ──

  const handleFileSelect = async (file: File) => {
    setUploadError("");
    setUploadStatus("");

    const validationError = validateLectureFile(file);
    if (validationError) {
      setUploadError(t[validationError as keyof typeof t] as string || validationError);
      return;
    }

    setUploadStatus(t.converting);

    try {
      const extracted = await convertFileToSections(file);
      setSections(extracted);
      setUploadStatus(t.conversionComplete);

      // Upload original file if editing an existing lecture
      if (isEdit) {
        const url = await uploadLectureFile(file, lecture!.id);
        setFileUrl(url);
      }
      // For new lectures, we'll upload after creation

      setFileType(file.type.includes("pdf") ? "pdf" : "docx");
    } catch {
      setUploadError(t.unexpectedError);
      setUploadStatus("");
    }
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  };

  const onFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileSelect(file);
  };

  // ── Section management ──

  const addSection = () => {
    setSections([
      ...sections,
      { id: newSectionId(), title: "", content: "" },
    ]);
  };

  const removeSection = (idx: number) => {
    setSections(sections.filter((_, i) => i !== idx));
  };

  const moveSection = (idx: number, dir: -1 | 1) => {
    const target = idx + dir;
    if (target < 0 || target >= sections.length) return;
    const arr = [...sections];
    [arr[idx], arr[target]] = [arr[target], arr[idx]];
    setSections(arr);
  };

  const updateSection = (idx: number, field: "title" | "content", value: string) => {
    setSections(
      sections.map((s, i) => (i === idx ? { ...s, [field]: value } : s)),
    );
  };

  // ── Version restore ──

  const restoreVersion = (v: LectureVersionDoc) => {
    setTitle(v.title);
    setDescription(v.description);
    setSections(v.sections);
    setTab("manual");
  };

  // ── Save ──

  const validate = (): string | null => {
    if (!title.trim()) return t.lectureTitle + " required";
    if (sections.length === 0) return t.noSections;
    return null;
  };

  const handleSave = async () => {
    const err = validate();
    if (err) {
      setError(err);
      return;
    }

    setError("");
    setSaving(true);

    try {
      const data: LectureFormData = {
        title: title.trim(),
        description: description.trim(),
        category,
        language,
        status,
        coverImage: coverImage.trim() || undefined,
        sections,
        order,
        fileUrl: fileUrl || undefined,
        fileType: fileType || "manual",
        publishAt: publishAt ? new Date(publishAt) : null,
      };

      if (isEdit) {
        await updateLecture(lecture!.id, data);
      } else {
        const newId = await createLecture(data);
        // Upload file for new lecture if sections came from file
        if (fileType !== "manual" && fileInputRef.current?.files?.[0]) {
          const url = await uploadLectureFile(
            fileInputRef.current.files[0],
            newId,
          );
          await updateLecture(newId, { fileUrl: url });
        }
      }

      onClose(true);
    } catch {
      setError(t.unexpectedError);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="lecture-editor">
      <h2>{isEdit ? t.editLecture : t.createLecture}</h2>

      {/* Meta fields */}
      <div className="le-row">
        <div className="le-field">
          <label>{t.lectureTitle}</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t.lectureTitle}
          />
        </div>
      </div>

      <div className="le-field">
        <label>{t.lectureDescription}</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
        />
      </div>

      <div className="le-row">
        <div className="le-field">
          <label>{t.lectureCategory}</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as TestCategory)}
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <div className="le-field">
          <label>{t.lectureLanguage}</label>
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value as "en" | "lv")}
          >
            <option value="en">English</option>
            <option value="lv">Latviešu</option>
          </select>
        </div>
        <div className="le-field">
          <label>{t.lectureStatus}</label>
          <select
            value={status}
            onChange={(e) =>
              setStatus(e.target.value as "draft" | "published")
            }
          >
            <option value="draft">{t.draft}</option>
            <option value="published">{t.published}</option>
          </select>
        </div>
      </div>

      {status === "published" && (
        <div className="le-row">
          <div className="le-field">
            <label>{t.scheduledPublish}</label>
            <input
              type="datetime-local"
              value={publishAt}
              onChange={(e) => setPublishAt(e.target.value)}
            />
          </div>
        </div>
      )}

      {/* Content tabs */}
      <div className="le-tabs">
        <button
          className={`le-tab${tab === "upload" ? " active" : ""}`}
          onClick={() => setTab("upload")}
        >
          {t.uploadFile}
        </button>
        <button
          className={`le-tab${tab === "manual" ? " active" : ""}`}
          onClick={() => setTab("manual")}
        >
          {t.manualEditor}
        </button>
        {isEdit && (
          <button
            className={`le-tab${tab === "history" ? " active" : ""}`}
            onClick={() => setTab("history")}
          >
            {t.versionHistory} (v{lecture!.version})
          </button>
        )}
      </div>

      {/* Upload tab */}
      {tab === "upload" && (
        <>
          <div
            className={`le-upload-zone${dragging ? " dragging" : ""}`}
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
          >
            <Upload size={32} />
            <p>{t.dragDropFile}</p>
            <p style={{ fontSize: "0.75rem" }}>PDF, DOCX — max 20 MB</p>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            style={{ display: "none" }}
            onChange={onFileInput}
          />
          {uploadStatus && (
            <div className="le-upload-progress">{uploadStatus}</div>
          )}
          {uploadError && (
            <div className="le-upload-error">{uploadError}</div>
          )}
        </>
      )}

      {/* Manual / sections editor (shown for both upload and manual tabs when sections exist) */}
      {(tab === "manual" || (tab === "upload" && sections.length > 0)) && (
        <div className="le-sections">
          {sections.map((sec, idx) => (
            <div key={sec.id} className="le-section-card">
              <div className="le-section-header">
                <input
                  type="text"
                  value={sec.title}
                  onChange={(e) =>
                    updateSection(idx, "title", e.target.value)
                  }
                  placeholder={`${t.sectionTitle} ${idx + 1}`}
                />
                <button
                  className="le-section-btn"
                  onClick={() => moveSection(idx, -1)}
                  disabled={idx === 0}
                >
                  <ArrowUp size={14} />
                </button>
                <button
                  className="le-section-btn"
                  onClick={() => moveSection(idx, 1)}
                  disabled={idx === sections.length - 1}
                >
                  <ArrowDown size={14} />
                </button>
                <button
                  className="le-section-btn danger"
                  onClick={() => removeSection(idx)}
                >
                  <Trash2 size={14} />
                </button>
              </div>
              <textarea
                className="le-section-content"
                value={sec.content}
                onChange={(e) =>
                  updateSection(idx, "content", e.target.value)
                }
                placeholder={t.sectionContent}
              />
            </div>
          ))}
          <button className="le-add-section-btn" onClick={addSection}>
            <Plus size={16} />
            {t.addSection}
          </button>
        </div>
      )}

      {/* Version history tab */}
      {tab === "history" && (
        <div className="le-versions">
          {versions.length === 0 ? (
            <p style={{ color: "var(--text-muted)", textAlign: "center" }}>
              {t.noVersions}
            </p>
          ) : (
            versions.map((v) => (
              <div key={v.version} className="le-version-item">
                <div className="le-version-info">
                  <span className="le-version-num">
                    v{v.version} — {v.title}
                  </span>
                  <span className="le-version-date">
                    {v.savedAt
                      ? new Date(
                          (v.savedAt as { seconds: number }).seconds * 1000,
                        ).toLocaleString()
                      : "—"}
                  </span>
                </div>
                <button
                  className="le-version-restore-btn"
                  onClick={() => restoreVersion(v)}
                >
                  <RotateCcw size={14} />
                  {t.restore}
                </button>
              </div>
            ))
          )}
        </div>
      )}

      {/* Validation error */}
      {error && <div className="le-validation-error">{error}</div>}

      {/* Footer */}
      <div className="le-footer">
        <button className="le-btn" onClick={() => onClose()}>
          {t.cancel}
        </button>
        <button
          className="le-btn primary"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? t.loading : isEdit ? t.saveLecture : t.createLecture}
        </button>
      </div>
    </div>
  );
};

export default LectureEditor;
