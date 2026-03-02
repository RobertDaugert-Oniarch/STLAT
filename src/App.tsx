import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "./context/ThemeContext";
import { LangProvider } from "./context/LangContext";
import ThemeToggle from "./components/ThemeToggle/ThemeToggle";
import LangToggle from "./components/LangToggle/LangToggle";
import LoginPage from "./pages/LoginPage/LoginPage";
import "./App.css";

function App() {
  return (
    <ThemeProvider>
      <LangProvider>
        {/* Global controls rendered outside the router so they persist on all pages */}
        <ThemeToggle />
        <LangToggle />
        <BrowserRouter>
          <Routes>
            {/* Login / Sign-up page */}
            <Route path="/login" element={<LoginPage />} />

            {/* Redirect any unknown path to login */}
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </BrowserRouter>
      </LangProvider>
    </ThemeProvider>
  );
}

export default App;


