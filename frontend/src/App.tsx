import React, { Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import ErrorBoundary from './components/common/ErrorBoundary';
import { AuthProvider } from './contexts/AuthContext';
import { EmotionLabelsProvider } from './contexts/EmotionLabelsContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { ToastProvider } from './contexts/ToastContext';
import Layout from './components/Layout/Layout';
import Toast from './components/Toast/Toast';
import PageSkeleton from './components/PageSkeleton';

// Synchronous — most frequently used pages
import Login from './pages/Login/Login';
import Register from './pages/Register/Register';
import SchedulePage from './pages/Schedule/Schedule';
import ThoughtsPage from './pages/Thoughts/Thoughts';

// Lazy-loaded — less frequently used pages
const AnalysisPage = React.lazy(() => import('./pages/Analysis/Analysis'));
const HistoryPage = React.lazy(() => import('./pages/History/History'));
const SettingsPage = React.lazy(() => import('./pages/Settings/Settings'));

function App() {
  return (
    <ErrorBoundary>
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
                  <Route path="/history" element={<Suspense fallback={<PageSkeleton />}><HistoryPage /></Suspense>} />
                  <Route path="/analysis" element={<Suspense fallback={<PageSkeleton />}><AnalysisPage /></Suspense>} />
                  <Route path="/settings" element={<Suspense fallback={<PageSkeleton />}><SettingsPage /></Suspense>} />
                </Route>
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
              </BrowserRouter>
              <Toast />
            </ToastProvider>
          </ThemeProvider>
        </EmotionLabelsProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
