import { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import Header from './Header';
import Sidebar from './Sidebar';
import BottomNav from './BottomNav';
import './Layout.css'; // We'll create this optionally, but we can also use globals

export default function Layout({ children }) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth < 768); // Breakpoint for mobile
    };
    checkIsMobile();
    const resizeListener = () => checkIsMobile();
    window.addEventListener('resize', resizeListener);
    return () => window.removeEventListener('resize', resizeListener);
  }, []);

  return (
    <>
      <Header />
      {!isMobile ? (
        <>
          <Sidebar />
          <main className="main-content">
            {children}
          </main>
        </>
      ) : (
        <>
          <main className="main-content">
            {children}
          </main>
          <BottomNav />
        </>
      )}
    </>
  );
}
