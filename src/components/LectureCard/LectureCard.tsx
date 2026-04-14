import type { LectureDoc, UserLectureProgress } from "../../types/lecture";
import "./LectureCard.css";

const CATEGORY_COLORS: Record<string, string> = {
  Knowledge: "#3c72c3",
  Attitudes: "#e17055",
  Behaviour: "#00b894",
  "Confidence in One's Judgement": "#6c5ce7",
};

const CATEGORY_ICONS: Record<string, string> = {
  Knowledge: "📘",
  Attitudes: "💡",
  Behaviour: "🎯",
  "Confidence in One's Judgement": "🧠",
};

const LANG_LABELS: Record<string, string> = {
  en: "EN",
  lv: "LV",
};

interface LectureCardProps {
  lecture: LectureDoc;
  progress?: UserLectureProgress;
  onClick: () => void;
}

const LectureCard = ({ lecture, progress, onClick }: LectureCardProps) => {
  const title = lecture.title;
  const description = lecture.description ?? "";
  const color = CATEGORY_COLORS[lecture.category] ?? "#3c72c3";
  const icon = CATEGORY_ICONS[lecture.category] ?? "📄";

  const totalSections = lecture.sections.length;
  const completedCount = progress?.completedSections?.length ?? 0;
  const pct = totalSections > 0 ? Math.round((completedCount / totalSections) * 100) : 0;
  const isCompleted = totalSections > 0 && completedCount >= totalSections;

  return (
    <button className="lecture-card" onClick={onClick} type="button" aria-label={`${title} — ${pct}%`}>
      <div className="lecture-card-cover">
        {lecture.coverImage ? (
          <img
            src={lecture.coverImage}
            alt={title}
            className="lecture-card-img"
            loading="lazy"
          />
        ) : (
          <div
            className="lecture-card-placeholder"
            style={{
              background: `linear-gradient(135deg, ${color}44, ${color}22)`,
            }}
          >
            <span className="lecture-card-placeholder-icon">{icon}</span>
          </div>
        )}

        <span
          className="lecture-card-badge"
          style={{ background: `${color}cc` }}
        >
          {lecture.category}
        </span>

        <span className="lecture-card-lang-badge">
          {LANG_LABELS[lecture.language] ?? lecture.language}
        </span>

        {isCompleted && <span className="lecture-card-check">✓</span>}
      </div>

      <div className="lecture-card-body">
        <span className="lecture-card-title">{title}</span>
        {description && (
          <span className="lecture-card-desc">{description}</span>
        )}
        {lecture.avgRating != null && lecture.ratingCount != null && lecture.ratingCount > 0 && (
          <div className="lecture-card-rating">
            <span className="lecture-card-rating-stars">
              {"★".repeat(Math.round(lecture.avgRating))}{"☆".repeat(5 - Math.round(lecture.avgRating))}
            </span>
            <span className="lecture-card-rating-count">({lecture.ratingCount})</span>
          </div>
        )}
        {totalSections > 0 && (
          <div className="lecture-card-progress">
            <div className="lecture-card-progress-bar">
              <div
                className="lecture-card-progress-fill"
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="lecture-card-progress-text">{pct}%</span>
          </div>
        )}
      </div>
    </button>
  );
};

export default LectureCard;
