import { useState, useEffect } from 'react';
import { Outlet, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useVisualViewport } from '../../hooks/useVisualViewport';
import Sidebar from '../../components/Sidebar/Sidebar';
import MobileNav from '../../components/MobileNav/MobileNav';
import MobileMoreDrawer from '../../components/MobileMoreDrawer/MobileMoreDrawer';
import OnboardingProgress from '../../components/OnboardingProgress/OnboardingProgress';
import ScrollToTop from '../../components/ScrollToTop/ScrollToTop';
import './Layout.css';

const MOBILE_BREAKPOINT = 768;

export default function Layout() {
  const { isAuthenticated } = useAuth();
  const location = useLocation();
  const [pageKey, setPageKey] = useState(0);
  const [isMobile, setIsMobile] = useState(
    typeof window !== 'undefined' ? window.innerWidth <= MOBILE_BREAKPOINT : false
  );
  const [moreDrawerOpen, setMoreDrawerOpen] = useState(false);

  useVisualViewport();

  useEffect(() => {
    setPageKey(k => k + 1);
  }, [location.pathname]);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= MOBILE_BREAKPOINT);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    setMoreDrawerOpen(false);
  }, [location.pathname]);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (isMobile) {
    return (
      <div className="mobile-layout">
        <main className="mobile-main">
          <OnboardingProgress />
          <div className="page-enter" key={pageKey}>
            <Outlet />
          </div>
        </main>
        <MobileNav onMoreClick={() => setMoreDrawerOpen(true)} />
        <MobileMoreDrawer
          open={moreDrawerOpen}
          onClose={() => setMoreDrawerOpen(false)}
        />
        <ScrollToTop />
      </div>
    );
  }

  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">
        <OnboardingProgress />
        <div className="page-enter" key={pageKey}>
          <Outlet />
        </div>
      </main>
      <ScrollToTop />
    </div>
  );
}
