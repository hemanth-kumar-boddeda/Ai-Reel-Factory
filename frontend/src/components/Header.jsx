import { Link, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';

export default function Header() {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return !!localStorage.getItem('accessToken');
  });
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    setIsAuthenticated(!!token);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('accessToken');
    setIsAuthenticated(false);
    navigate('/login');
  };

  return (
    <header className="header">
      <div className="container">
        <Link to="/" className="brand">
          <span className="brand-prefix">AI </span>
          <span className="brand-suffix">Reel Factory</span>
        </Link>
        {isAuthenticated && (
          <button onClick={handleLogout} className="btn btn-secondary">
            Logout
          </button>
        )}
      </div>
    </header>
  );
}
