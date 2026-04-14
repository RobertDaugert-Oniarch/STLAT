import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "./context/ThemeContext";
import { LangProvider } from "./context/LangContext";
import AdminLayout from "./components/AdminLayout/AdminLayout";
import "./App.css";

const LoginPage = lazy(() => import("./pages/LoginPage/LoginPage"));
const ProfilePage = lazy(() => import("./pages/ProfilePage/ProfilePage"));
const SettingsPage = lazy(() => import("./pages/SettingsPage/SettingsPage"));
const EmailChangePage = lazy(() => import("./pages/EmailChangePage/EmailChangePage"));
const PasswordChangePage = lazy(() => import("./pages/PasswordChangePage/PasswordChangePage"));
const PasswordResetPage = lazy(() => import("./pages/PasswordResetPage/PasswordResetPage"));
const VerifyEmailPage = lazy(() => import("./pages/VerifyEmailPage/VerifyEmailPage"));
const ProfileSetupPage = lazy(() => import("./pages/ProfileSetupPage/ProfileSetupPage"));
const TestPage = lazy(() => import("./pages/TestPage/TestPage"));
const GuestTestPage = lazy(() => import("./pages/GuestTestPage/GuestTestPage"));
const LecturesPage = lazy(() => import("./pages/LecturesPage/LecturesPage"));
const LectureViewerPage = lazy(() => import("./pages/LectureViewerPage/LectureViewerPage"));
const AdminDashboardPage = lazy(() => import("./pages/AdminDashboardPage/AdminDashboardPage"));
const AdminStatisticsPage = lazy(() => import("./pages/AdminStatisticsPage/AdminStatisticsPage"));
const AdminUsersPage = lazy(() => import("./pages/AdminUsersPage/AdminUsersPage"));
const AdminAuditPage = lazy(() => import("./pages/AdminAuditPage/AdminAuditPage"));
const AdminLecturesPage = lazy(() => import("./pages/AdminLecturesPage/AdminLecturesPage"));

const PageSpinner = () => (
  <div className="page-spinner-wrapper">
    <div className="page-spinner" />
  </div>
);

function App() {
  return (
    <ThemeProvider>
      <LangProvider>
        <BrowserRouter>
          <Suspense fallback={<PageSpinner />}>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/guest-test" element={<GuestTestPage />} />
              <Route path="/reset-password" element={<PasswordResetPage />} />
              <Route path="/verify-email" element={<VerifyEmailPage />} />
              <Route path="/profile-setup" element={<ProfileSetupPage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/test" element={<TestPage />} />
              <Route path="/lectures" element={<LecturesPage />} />
              <Route path="/lectures/:id" element={<LectureViewerPage />} />
              <Route path="/admin/lectures/preview/:id" element={<LectureViewerPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/settings/email" element={<EmailChangePage />} />
              <Route path="/settings/password" element={<PasswordChangePage />} />
              {/* Admin routes */}
              <Route path="/admin" element={<AdminLayout />}>
                <Route index element={<AdminDashboardPage />} />
                <Route path="lectures" element={<AdminLecturesPage />} />
                <Route path="statistics" element={<AdminStatisticsPage />} />
                <Route path="users" element={<AdminUsersPage />} />
                <Route path="audit" element={<AdminAuditPage />} />
              </Route>
              <Route path="*" element={<Navigate to="/login" replace />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </LangProvider>
    </ThemeProvider>
  );
}

export default App;


