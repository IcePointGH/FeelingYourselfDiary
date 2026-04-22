import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { EmotionLabelsProvider } from './contexts/EmotionLabelsContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { ToastProvider } from './contexts/ToastContext';
import Layout from './components/Layout/Layout';
import Toast from './components/Toast/Toast';
import Login from './pages/Login/Login';
import Register from './pages/Register/Register';
import SchedulePage from './pages/Schedule/Schedule';
import ThoughtsPage from './pages/Thoughts/Thoughts';
import HistoryPage from './pages/History/History';
import AnalysisPage from './pages/Analysis/Analysis';
import SettingsPage from './pages/Settings/Settings';

function App() {
  return (
    <AuthProvider>
      <EmotionLabelsProvider>
        <ThemeProvider>
          <ToastProvider>
            <BrowserRouter>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route element={<Layout />}>
                <Route path="/" element={<SchedulePage />} />
                <Route path="/thoughts" element={<ThoughtsPage />} />
                <Route path="/history" element={<HistoryPage />} />
                <Route path="/analysis" element={<AnalysisPage />} />
                <Route path="/settings" element={<SettingsPage />} />
              </Route>
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
            </BrowserRouter>
            <Toast />
          </ToastProvider>
        </ThemeProvider>
      </EmotionLabelsProvider>
    </AuthProvider>
  );
}

export default App;
