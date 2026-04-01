import { useState } from "react";
import { useLang } from "../../context/LangContext";
import { countries, type Country } from "../../data/countries";
import type { GuestDemographics } from "../../types/user";
import "./DemographicsForm.css";

interface DemographicsFormProps {
  onSubmit: (demographics: GuestDemographics) => void;
  onSkip: () => void;
  loading?: boolean;
}

const DemographicsForm = ({ onSubmit, onSkip, loading }: DemographicsFormProps) => {
  const { t, lang } = useLang();

  const [age, setAge] = useState("");
  const [gender, setGender] = useState("");
  const [country, setCountry] = useState("");
  const [education, setEducation] = useState("");
  const [occupation, setOccupation] = useState("");

  const isComplete = age && gender && country && education && occupation;

  const handleSubmit = () => {
    if (!isComplete) return;
    onSubmit({ age, gender, country, education, occupation });
  };

  return (
    <div className="demo-form">
      <h1 className="demo-title">{t.demographicsTitle}</h1>
      <p className="demo-subtitle">{t.demographicsSubtitle}</p>

      <div className="demo-fields">
        {/* Age */}
        <div className="demo-field">
          <label className="demo-label">{t.demoAge}</label>
          <select
            className="demo-select"
            value={age}
            onChange={(e) => setAge(e.target.value)}
          >
            <option value="">{t.demoSelectPlaceholder}</option>
            <option value="under18">{t.demoAgeUnder18}</option>
            <option value="18-24">{t.demoAge1824}</option>
            <option value="25-34">{t.demoAge2534}</option>
            <option value="35-44">{t.demoAge3544}</option>
            <option value="45-54">{t.demoAge4554}</option>
            <option value="55+">{t.demoAge55}</option>
          </select>
        </div>

        {/* Gender */}
        <div className="demo-field">
          <label className="demo-label">{t.demoGender}</label>
          <select
            className="demo-select"
            value={gender}
            onChange={(e) => setGender(e.target.value)}
          >
            <option value="">{t.demoSelectPlaceholder}</option>
            <option value="male">{t.demoGenderMale}</option>
            <option value="female">{t.demoGenderFemale}</option>
            <option value="other">{t.demoGenderOther}</option>
            <option value="preferNotToSay">{t.demoGenderPreferNot}</option>
          </select>
        </div>

        {/* Country */}
        <div className="demo-field">
          <label className="demo-label">{t.demoCountry}</label>
          <select
            className="demo-select"
            value={country}
            onChange={(e) => setCountry(e.target.value)}
          >
            <option value="">{t.demoSelectPlaceholder}</option>
            {countries
              .map((c) => ({ code: c.code, label: lang === "lv" ? c.lv : c.en }))
              .sort((a, b) => a.label.localeCompare(b.label))
              .map((c) => (
              <option key={c.code} value={c.code}>{c.label}</option>
            ))}
          </select>
        </div>

        {/* Education */}
        <div className="demo-field">
          <label className="demo-label">{t.demoEducation}</label>
          <select
            className="demo-select"
            value={education}
            onChange={(e) => setEducation(e.target.value)}
          >
            <option value="">{t.demoSelectPlaceholder}</option>
            <option value="highSchool">{t.demoEduHighSchool}</option>
            <option value="bachelors">{t.demoEduBachelors}</option>
            <option value="masters">{t.demoEduMasters}</option>
            <option value="doctorate">{t.demoEduDoctorate}</option>
            <option value="other">{t.demoEduOther}</option>
          </select>
        </div>

        {/* Occupation */}
        <div className="demo-field">
          <label className="demo-label">{t.demoOccupation}</label>
          <select
            className="demo-select"
            value={occupation}
            onChange={(e) => setOccupation(e.target.value)}
          >
            <option value="">{t.demoSelectPlaceholder}</option>
            <option value="student">{t.demoOccStudent}</option>
            <option value="employed">{t.demoOccEmployed}</option>
            <option value="selfEmployed">{t.demoOccSelfEmployed}</option>
            <option value="unemployed">{t.demoOccUnemployed}</option>
            <option value="retired">{t.demoOccRetired}</option>
            <option value="other">{t.demoOccOther}</option>
          </select>
        </div>
      </div>

      <div className="demo-actions">
        <button
          className="demo-btn demo-btn--submit"
          onClick={handleSubmit}
          disabled={!isComplete || loading}
        >
          {loading ? t.loading : t.submitDemographics}
        </button>
        <button
          className="demo-btn demo-btn--skip"
          onClick={onSkip}
          disabled={loading}
        >
          {t.skipDemographics}
        </button>
      </div>
    </div>
  );
};

export default DemographicsForm;
