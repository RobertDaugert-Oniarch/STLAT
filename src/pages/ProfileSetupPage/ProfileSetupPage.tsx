import { useState, useEffect, useMemo } from "react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { db } from "../../firebase/config";
import { USERS } from "../../firebase/collections";
import { useLang } from "../../context/LangContext";
import { useTheme } from "../../context/ThemeContext";
import { useAuthGuard } from "../../hooks/useAuthGuard";
import { SettingsSelect, SearchableSettingsSelect } from "../../components/SettingsSelect/SettingsSelect";
import type { SettingsSelectOption } from "../../components/SettingsSelect/SettingsSelect";
import { countries } from "../../data/countries";
import ThemeToggle from "../../components/ThemeToggle/ThemeToggle";
import LangToggle from "../../components/LangToggle/LangToggle";
import BgShapes from "../../components/BgShapes/BgShapes";
import "../LoginPage/LoginPage.css";
import "./ProfileSetupPage.css";

const ProfileSetupPage = () => {
  const { t, lang } = useLang();
  const { applyTheme } = useTheme();
  const { applyLang } = useLang();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuthGuard();

  const [pageLoading, setPageLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [ageGroup, setAgeGroup] = useState("");
  const [country, setCountry] = useState("");
  const [gender, setGender] = useState("");
  const [education, setEducation] = useState("");
  const [employment, setEmployment] = useState("");

  // Redirect if profile already complete
  useEffect(() => {
    if (!user) return;
    const check = async () => {
      try {
        const snap = await getDoc(doc(db, USERS, user.uid));
        if (snap.exists()) {
          const data = snap.data();
          if (data.profileComplete) {
            navigate("/profile", { replace: true });
            return;
          }
          // Apply saved theme/lang
          if (data.theme === "light" || data.theme === "dark") applyTheme(data.theme);
          if (data.lang === "en" || data.lang === "lv") applyLang(data.lang);
        }
      } catch {
        // continue
      } finally {
        setPageLoading(false);
      }
    };
    check();
  }, [user, navigate, applyTheme, applyLang]);

  const ageGroupOptions: SettingsSelectOption[] = useMemo(() => [
    { value: "under_16", label: t.ageGroupUnder16 },
    { value: "16_18", label: t.ageGroup16to18 },
    { value: "19_25", label: t.ageGroup19to25 },
    { value: "26_35", label: t.ageGroup26to35 },
    { value: "36_50", label: t.ageGroup36to50 },
    { value: "over_50", label: t.ageGroupOver50 },
  ], [t]);

  const genderOptions: SettingsSelectOption[] = useMemo(() => [
    { value: "male", label: t.genderMale },
    { value: "female", label: t.genderFemale },
    { value: "prefer_not_to_say", label: t.genderPreferNotToSay },
  ], [t]);

  const educationOptions: SettingsSelectOption[] = useMemo(() => [
    { value: "primary", label: t.educationPrimary },
    { value: "secondary", label: t.educationSecondary },
    { value: "professional", label: t.educationProfessional },
    { value: "higher", label: t.educationHigher },
    { value: "bachelor", label: t.educationBachelor },
    { value: "master", label: t.educationMaster },
  ], [t]);

  const employmentOptions: SettingsSelectOption[] = useMemo(() => [
    { value: "school_student", label: t.employmentSchoolStudent },
    { value: "student", label: t.employmentStudent },
    { value: "employed", label: t.employmentEmployed },
    { value: "self_employed", label: t.employmentSelfEmployed },
    { value: "unemployed", label: t.employmentUnemployed },
    { value: "retired", label: t.employmentRetired },
    { value: "prefer_not_to_say", label: t.employmentPreferNotToSay },
  ], [t]);

  const countryOptions: SettingsSelectOption[] = useMemo(() =>
    countries
      .map((c) => ({ value: c.code, label: lang === "lv" ? c.lv : c.en }))
      .sort((a, b) => a.label.localeCompare(b.label)),
    [lang],
  );

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      await setDoc(doc(db, USERS, user.uid), {
        ageGroup: ageGroup || "prefer_not_to_say",
        country: country || "prefer_not_to_say",
        gender: gender || "prefer_not_to_say",
        education: education || "prefer_not_to_say",
        employment: employment || "prefer_not_to_say",
        profileComplete: true,
      }, { merge: true });
      navigate("/profile");
    } catch {
      // silent
    } finally {
      setSaving(false);
    }
  };

  const handleSkip = async () => {
    if (!user) return;
    setSaving(true);
    try {
      await setDoc(doc(db, USERS, user.uid), {
        ageGroup: "prefer_not_to_say",
        country: "prefer_not_to_say",
        gender: "prefer_not_to_say",
        education: "prefer_not_to_say",
        employment: "prefer_not_to_say",
        profileComplete: true,
      }, { merge: true });
      navigate("/profile");
    } catch {
      // silent
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || pageLoading) {
    return (
      <div className="login-page">
        <p style={{ color: "var(--text)", opacity: 0.5, textAlign: "center", marginTop: "40vh" }}>
          {t.loading}
        </p>
      </div>
    );
  }

  return (
    <div className="login-page">
      <ThemeToggle />
      <LangToggle />
      <BgShapes prefix="login" />

      <div className="login-card psp-card">
        <div className="login-header">
          <h1 className="login-title">{t.profileSetupTitle}</h1>
          <p className="login-subtitle">{t.profileSetupSubtitle}</p>
        </div>

        <div className="psp-fields">
          <div className="psp-field">
            <label className="psp-label">{t.profileSetupAgeGroup}</label>
            <SettingsSelect
              value={ageGroup}
              onChange={setAgeGroup}
              options={ageGroupOptions}
              placeholder={t.profileSetupSelectPlaceholder}
            />
          </div>

          <div className="psp-field">
            <label className="psp-label">{t.profileSetupCountry}</label>
            <SearchableSettingsSelect
              value={country}
              onChange={setCountry}
              options={countryOptions}
              placeholder={t.profileSetupSelectPlaceholder}
              searchPlaceholder={t.profileSetupSearchCountry}
            />
          </div>

          <div className="psp-field">
            <label className="psp-label">{t.profileSetupGender}</label>
            <SettingsSelect
              value={gender}
              onChange={setGender}
              options={genderOptions}
              placeholder={t.profileSetupSelectPlaceholder}
            />
          </div>

          <div className="psp-field">
            <label className="psp-label">{t.profileSetupEducation}</label>
            <SettingsSelect
              value={education}
              onChange={setEducation}
              options={educationOptions}
              placeholder={t.profileSetupSelectPlaceholder}
            />
          </div>

          <div className="psp-field">
            <label className="psp-label">{t.profileSetupEmployment}</label>
            <SettingsSelect
              value={employment}
              onChange={setEmployment}
              options={employmentOptions}
              placeholder={t.profileSetupSelectPlaceholder}
            />
          </div>
        </div>

        <div className="psp-actions">
          <button
            className="psp-skip-btn"
            onClick={handleSkip}
            disabled={saving}
            type="button"
          >
            {t.profileSetupSkip}
          </button>
          <button
            className="login-button psp-save-btn"
            onClick={handleSave}
            disabled={saving}
            type="button"
          >
            {saving ? t.loading : t.profileSetupSave}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProfileSetupPage;
