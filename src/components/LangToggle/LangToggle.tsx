import { useLang } from "../../context/LangContext";
import "./LangToggle.css";

const LangToggle = () => {
  const { lang, t, toggleLang } = useLang();

  return (
    <button
      className="lang-toggle"
      onClick={toggleLang}
      aria-label={lang === "en" ? t.switchToLv : t.switchToEn}
      title={lang === "en" ? t.switchToLv : t.switchToEn}
    >
      {/* Show the ACTIVE language */}
      {lang === "en" ? "EN" : "LV"}
    </button>
  );
};

export default LangToggle;
