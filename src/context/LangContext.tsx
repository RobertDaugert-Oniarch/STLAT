import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { translations, type Language, type Translations } from "../translations";

interface LangContextValue {
  lang: Language;
  t: Translations;
  toggleLang: () => void;
  applyLang: (lang: Language) => void;
}

const LangContext = createContext<LangContextValue | null>(null);

export const LangProvider = ({ children }: { children: ReactNode }) => {
  // Initialize from localStorage, fall back to "en"
  const [lang, setLang] = useState<Language>(() => {
    const saved = localStorage.getItem("lang");
    if (saved === "en" || saved === "lv") return saved;
    return "en";
  });

  // Sync the HTML lang attribute and localStorage on every change
  useEffect(() => {
    document.documentElement.setAttribute("lang", lang);
    localStorage.setItem("lang", lang);
  }, [lang]);

  const toggleLang = () => setLang((prev) => (prev === "en" ? "lv" : "en"));

  const applyLang = (l: Language) => setLang(l);

  return (
    <LangContext.Provider value={{ lang, t: translations[lang], toggleLang, applyLang }}>
      {children}
    </LangContext.Provider>
  );
};

// Convenience hook -- throws if used outside LangProvider
export const useLang = (): LangContextValue => {
  const ctx = useContext(LangContext);
  if (!ctx) throw new Error("useLang must be used within <LangProvider>");
  return ctx;
};
