import { useNavigate, useLocation } from 'react-router-dom';

export default function PrivateRoute({ children }) {
  const token = localStorage.getItem('accessToken');
  const location = useLocation();
  const navigate = useNavigate();
  console.log('PrivateRoute: token=', token, 'location=', location.pathname);

  if (!token) {
    console.log('PrivateRoute: redirecting to login');
    navigate('/login', { replace: true, state: { from: location } });
    return null; // Render nothing while redirecting
  }

  return children;
}