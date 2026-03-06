import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "./context/ThemeContext";
import { LangProvider } from "./context/LangContext";
import LoginPage from "./pages/LoginPage/LoginPage";
import ProfilePage from "./pages/ProfilePage/ProfilePage";
import SettingsPage from "./pages/SettingsPage/SettingsPage";
import EmailChangePage from "./pages/EmailChangePage/EmailChangePage";
import PasswordChangePage from "./pages/PasswordChangePage/PasswordChangePage";
import VerifyEmailPage from "./pages/VerifyEmailPage/VerifyEmailPage";
import SurveyPage from "./pages/SurveyPage/SurveyPage";
import "./App.css";

function App() {
  return (
    <ThemeProvider>
      <LangProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/verify-email" element={<VerifyEmailPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/survey" element={<SurveyPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/settings/email" element={<EmailChangePage />} />
            <Route path="/settings/password" element={<PasswordChangePage />} />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </BrowserRouter>
      </LangProvider>
    </ThemeProvider>
  );
}

export default App;


