import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "./context/ThemeContext";
import { LangProvider } from "./context/LangContext";
import LoginPage from "./pages/LoginPage/LoginPage";
import ProfilePage from "./pages/ProfilePage/ProfilePage";
import SettingsPage from "./pages/SettingsPage/SettingsPage";
import EmailChangePage from "./pages/EmailChangePage/EmailChangePage";
import PasswordChangePage from "./pages/PasswordChangePage/PasswordChangePage";
import PasswordResetPage from "./pages/PasswordResetPage/PasswordResetPage";
import VerifyEmailPage from "./pages/VerifyEmailPage/VerifyEmailPage";
import TestPage from "./pages/TestPage/TestPage";
import AdminLayout from "./components/AdminLayout/AdminLayout";
import AdminDashboardPage from "./pages/AdminDashboardPage/AdminDashboardPage";
import AdminStatisticsPage from "./pages/AdminStatisticsPage/AdminStatisticsPage";
import AdminUsersPage from "./pages/AdminUsersPage/AdminUsersPage";
import AdminAuditPage from "./pages/AdminAuditPage/AdminAuditPage";
import "./App.css";

function App() {
  return (
    <ThemeProvider>
      <LangProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/reset-password" element={<PasswordResetPage />} />
            <Route path="/verify-email" element={<VerifyEmailPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/test" element={<TestPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/settings/email" element={<EmailChangePage />} />
            <Route path="/settings/password" element={<PasswordChangePage />} />
            {/* Admin routes */}
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<AdminDashboardPage />} />
              <Route path="statistics" element={<AdminStatisticsPage />} />
              <Route path="users" element={<AdminUsersPage />} />
              <Route path="audit" element={<AdminAuditPage />} />
            </Route>
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </BrowserRouter>
      </LangProvider>
    </ThemeProvider>
  );
}

export default App;


