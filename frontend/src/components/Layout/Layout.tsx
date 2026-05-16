import { useState, useEffect } from 'react';
import { Outlet, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import Sidebar from '../../components/Sidebar/Sidebar';
import ScrollToTop from '../../components/ScrollToTop/ScrollToTop';
import './Layout.css';

export default function Layout() {
  const { isAuthenticated } = useAuth();
  const location = useLocation();
  const [pageKey, setPageKey] = useState(0);

  useEffect(() => {
    setPageKey(k => k + 1);
  }, [location.pathname]);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">
        <div className="page-enter" key={pageKey}>
          <Outlet />
        </div>
      </main>
      <ScrollToTop />
    </div>
  );
}
