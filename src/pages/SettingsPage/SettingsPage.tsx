import { useState, useEffect, useMemo } from "react";
import { deleteUser } from "firebase/auth";
import { doc, getDoc, setDoc, deleteDoc, collection, getDocs } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../../firebase/config";
import { USERS, QUIZ_RESULTS, TEST_HISTORY, USERNAMES } from "../../firebase/collections";
import { useLang } from "../../context/LangContext";
import { useTheme } from "../../context/ThemeContext";
import { useAuthGuard } from "../../hooks/useAuthGuard";
import { getFirebaseErrorMessage, getFirebaseErrorCode } from "../../utils/firebaseErrors";
import { SettingsSelect, SearchableSettingsSelect } from "../../components/SettingsSelect/SettingsSelect";
import { countries } from "../../data/countries";
import BgShapes from "../../components/BgShapes/BgShapes";
import "./SettingsPage.css";

const SettingsPage = () => {
  const { t, lang, applyLang } = useLang();
  const { theme, applyTheme } = useTheme();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuthGuard();

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [error, setError] = useState("");

  // Demographics
  const [ageGroup, setAgeGroup] = useState("");
  const [country, setCountry] = useState("");
  const [gender, setGender] = useState("");
  const [education, setEducation] = useState("");
  const [employment, setEmployment] = useState("");

  useEffect(() => {
    if (!user) return;
    setEmail(user.email ?? "");

    const loadSettings = async () => {
      try {
        const userDoc = await getDoc(doc(db, USERS, user.uid));
        if (userDoc.exists()) {
          const data = userDoc.data();
          setUsername(data.fullUsername ?? "");
          if (data.theme === "light" || data.theme === "dark") applyTheme(data.theme);
          if (data.lang === "en" || data.lang === "lv") applyLang(data.lang);
          // Load demographics
          if (data.ageGroup) setAgeGroup(data.ageGroup);
          if (data.country) setCountry(data.country);
          if (data.gender) setGender(data.gender);
          if (data.education) setEducation(data.education);
          if (data.employment) setEmployment(data.employment);
          if (user.email && data.email !== user.email) {
            await setDoc(doc(db, USERS, user.uid), { email: user.email }, { merge: true });
          }
        }
      } catch (err) {
        console.warn("SettingsPage: Firestore read failed", err);
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
  }, [user, applyTheme, applyLang]);

  const handleThemeChange = async (newTheme: "light" | "dark") => {
    applyTheme(newTheme);
    const user = auth.currentUser;
    if (!user) return;
    try {
      await setDoc(doc(db, USERS, user.uid), { theme: newTheme }, { merge: true });
    } catch (err) {
      console.warn("SettingsPage: Failed to save theme", err);
    }
  };

  const handleLangChange = async (newLang: "en" | "lv") => {
    applyLang(newLang);
    const user = auth.currentUser;
    if (!user) return;
    try {
      await setDoc(doc(db, USERS, user.uid), { lang: newLang }, { merge: true });
    } catch (err) {
      console.warn("SettingsPage: Failed to save language", err);
    }
  };

  const handleDemoChange = async (field: string, value: string, setter: (v: string) => void) => {
    setter(value);
    const user = auth.currentUser;
    if (!user) return;
    try {
      await setDoc(doc(db, USERS, user.uid), { [field]: value }, { merge: true });
    } catch (err) {
      console.warn(`SettingsPage: Failed to save ${field}`, err);
    }
  };

  const ageGroupOptions = useMemo(() => [
    { value: "under_16", label: t.ageGroupUnder16 },
    { value: "16_18", label: t.ageGroup16to18 },
    { value: "19_25", label: t.ageGroup19to25 },
    { value: "26_35", label: t.ageGroup26to35 },
    { value: "36_50", label: t.ageGroup36to50 },
    { value: "over_50", label: t.ageGroupOver50 },
    { value: "prefer_not_to_say", label: t.preferNotToSay },
  ], [t]);

  const genderOptions = useMemo(() => [
    { value: "male", label: t.genderMale },
    { value: "female", label: t.genderFemale },
    { value: "prefer_not_to_say", label: t.genderPreferNotToSay },
  ], [t]);

  const educationOptions = useMemo(() => [
    { value: "primary", label: t.educationPrimary },
    { value: "secondary", label: t.educationSecondary },
    { value: "professional", label: t.educationProfessional },
    { value: "higher", label: t.educationHigher },
    { value: "bachelor", label: t.educationBachelor },
    { value: "master", label: t.educationMaster },
    { value: "prefer_not_to_say", label: t.preferNotToSay },
  ], [t]);

  const employmentOptions = useMemo(() => [
    { value: "school_student", label: t.employmentSchoolStudent },
    { value: "student", label: t.employmentStudent },
    { value: "employed", label: t.employmentEmployed },
    { value: "self_employed", label: t.employmentSelfEmployed },
    { value: "unemployed", label: t.employmentUnemployed },
    { value: "retired", label: t.employmentRetired },
    { value: "prefer_not_to_say", label: t.employmentPreferNotToSay },
  ], [t]);

  const countryOptions = useMemo(() => [
    ...countries
      .map((c) => ({ value: c.code, label: lang === "lv" ? c.lv : c.en }))
      .sort((a, b) => a.label.localeCompare(b.label)),
    { value: "prefer_not_to_say", label: t.preferNotToSay },
  ], [lang, t]);

  const handleDeleteAccount = async () => {
    const user = auth.currentUser;
    if (!user) return;
    setError("");
    try {
      if (username) {
        await deleteDoc(doc(db, USERNAMES, username));
      }
      await deleteDoc(doc(db, USERS, user.uid));
      await deleteDoc(doc(db, QUIZ_RESULTS, user.uid));
      const sessionsSnap = await getDocs(collection(db, TEST_HISTORY, user.uid, "sessions"));
      await Promise.all(sessionsSnap.docs.map((d) => deleteDoc(d.ref)));
      await deleteUser(user);
      navigate("/login");
    } catch (err: unknown) {
      setShowDeleteConfirm(false);
      setError(getFirebaseErrorMessage(getFirebaseErrorCode(err), t));
    }
  };

  if (authLoading || loading) {
    return (
      <div className="settings-page">
        <p className="settings-page-loading">{t.loading}</p>
      </div>
    );
  }

  return (
    <div className="settings-page">
      <BgShapes prefix="settings" />

      <div className="settings-layout">
        <div className="settings-topbar">
          <button className="settings-back-btn" onClick={() => navigate("/profile")}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            {t.backToProfile}
          </button>
          <h1 className="settings-page-title">{t.settingsPageTitle}</h1>
        </div>

        {/* Account section */}
        <section className="settings-section">
          <h2 className="settings-section-heading">{t.account}</h2>
          <div className="settings-card">
            <div className="settings-field">
              <div className="settings-field-info">
                <span className="settings-field-label">{t.username}</span>
                <span className="settings-field-value">{username}</span>
              </div>
            </div>

            <div className="settings-field-divider" />

            <div className="settings-field">
              <div className="settings-field-info">
                <span className="settings-field-label">{t.email}</span>
                <span className="settings-field-value">{email}</span>
              </div>
              <button
                className="settings-action-btn settings-action-btn--neutral"
                onClick={() => navigate("/settings/email")}
              >
                {t.change}
              </button>
            </div>

            <div className="settings-field-divider" />

            <div className="settings-field">
              <div className="settings-field-info">
                <span className="settings-field-label">{t.password}</span>
                <span className="settings-field-value settings-field-value--masked">••••••••••••</span>
              </div>
              <button
                className="settings-action-btn settings-action-btn--neutral"
                onClick={() => navigate("/settings/password")}
              >
                {t.change}
              </button>
            </div>
          </div>
          {error && <p className="settings-page-error">{error}</p>}
        </section>

        {/* Settings section */}
        <section className="settings-section">
          <h2 className="settings-section-heading">{t.settings}</h2>
          <div className="settings-card">
            <div className="settings-field">
              <span className="settings-field-label">{t.theme}</span>
              <SettingsSelect
                value={theme}
                onChange={(v) => handleThemeChange(v as "light" | "dark")}
                options={[
                  { value: "light", label: t.themeLight },
                  { value: "dark", label: t.themeDark },
                ]}
              />
            </div>

            <div className="settings-field-divider" />

            <div className="settings-field">
              <span className="settings-field-label">{t.language}</span>
              <SettingsSelect
                value={lang}
                onChange={(v) => handleLangChange(v as "en" | "lv")}
                options={[
                  { value: "en", label: t.langEnglish },
                  { value: "lv", label: t.langLatvian },
                ]}
              />
            </div>
          </div>
        </section>

        {/* Demographics section */}
        <section className="settings-section">
          <h2 className="settings-section-heading">{t.demographics}</h2>
          <div className="settings-card">
            <div className="settings-field">
              <span className="settings-field-label">{t.profileSetupAgeGroup}</span>
              <SettingsSelect
                value={ageGroup}
                onChange={(v) => handleDemoChange("ageGroup", v, setAgeGroup)}
                options={ageGroupOptions}
                placeholder={t.profileSetupSelectPlaceholder}
              />
            </div>

            <div className="settings-field-divider" />

            <div className="settings-field">
              <span className="settings-field-label">{t.profileSetupCountry}</span>
              <SearchableSettingsSelect
                value={country}
                onChange={(v) => handleDemoChange("country", v, setCountry)}
                options={countryOptions}
                placeholder={t.profileSetupSelectPlaceholder}
                searchPlaceholder={t.profileSetupSearchCountry}
              />
            </div>

            <div className="settings-field-divider" />

            <div className="settings-field">
              <span className="settings-field-label">{t.profileSetupGender}</span>
              <SettingsSelect
                value={gender}
                onChange={(v) => handleDemoChange("gender", v, setGender)}
                options={genderOptions}
                placeholder={t.profileSetupSelectPlaceholder}
              />
            </div>

            <div className="settings-field-divider" />

            <div className="settings-field">
              <span className="settings-field-label">{t.profileSetupEducation}</span>
              <SettingsSelect
                value={education}
                onChange={(v) => handleDemoChange("education", v, setEducation)}
                options={educationOptions}
                placeholder={t.profileSetupSelectPlaceholder}
              />
            </div>

            <div className="settings-field-divider" />

            <div className="settings-field">
              <span className="settings-field-label">{t.profileSetupEmployment}</span>
              <SettingsSelect
                value={employment}
                onChange={(v) => handleDemoChange("employment", v, setEmployment)}
                options={employmentOptions}
                placeholder={t.profileSetupSelectPlaceholder}
              />
            </div>
          </div>
        </section>

        {/* Other section */}
        <section className="settings-section">
          <h2 className="settings-section-heading">{t.other}</h2>
          <div className="settings-card">
            <div className="settings-field">
              <div className="settings-field-info">
                <span className="settings-danger-title">{t.accountDeletion}</span>
                <span className="settings-field-label">{t.accountDeletionDesc}</span>
              </div>
              <button
                className="settings-action-btn settings-action-btn--danger"
                onClick={() => { setError(""); setShowDeleteConfirm(true); }}
              >
                {t.delete}
              </button>
            </div>
          </div>
        </section>
      </div>

      {/* Delete account confirmation modal */}
      {showDeleteConfirm && (
        <div className="settings-modal-overlay" onClick={() => setShowDeleteConfirm(false)}>
          <div className="settings-modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="settings-modal-title">{t.confirmDeleteAccount}</h3>
            <p className="settings-modal-desc">{t.confirmDeleteDesc}</p>
            <div className="settings-modal-actions">
              <button
                className="settings-modal-btn settings-modal-btn--cancel"
                onClick={() => setShowDeleteConfirm(false)}
              >
                {t.cancel}
              </button>
              <button
                className="settings-modal-btn settings-modal-btn--confirm"
                onClick={handleDeleteAccount}
              >
                {t.confirm}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SettingsPage;
