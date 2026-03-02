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
      {/* Show the TARGET language so user clicks to switch to it */}
      {lang === "en" ? "LV" : "EN"}
    </button>
  );
};

export default LangToggle;
