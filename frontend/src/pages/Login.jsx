import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    console.log('handleSubmit called');
    e.preventDefault();
    setError(null);
    setLoading(true);
    console.log('Login attempt started');
    try {
      console.log('About to make API call');
      api.post('/auth/login', new URLSearchParams({
        username: email,
        password: password
      }).toString(), {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      })
      .then(response => {
        console.log('Login response:', response);
        console.log('Response data:', response.data);
        console.log('About to set token');
        localStorage.setItem('accessToken', response.data.access_token);
        console.log('Token set in localStorage:', localStorage.getItem('accessToken'));
        console.log('About to navigate');
        navigate('/');
        console.log('Navigation called');
      })
      .catch(err => {
        console.log('API call error:', err);
        setLoading(false);
        console.log('Login error:', err);
        console.log('Error details:', err);
        if (err.response && err.response.data && err.response.data.detail) {
          setError(err.response.data.detail);
        } else {
          setError('Login failed. Please check your credentials.');
        }
      });
    } catch (err) {
      setLoading(false);
      console.log('Login error (outer catch):', err);
      console.log('Error details:', err);
      if (err.response && err.response.data && err.response.data.detail) {
        setError(err.response.data.detail);
      } else {
        setError('Login failed. Please check your credentials.');
      }
    }
  };

  return (
    <div className="page-container">
      <h1>Login</h1>
      {error && <p style={{ color: '#ff6b6b' }}>{error}</p>}
      <form onSubmit={handleSubmit} className="login-form">
        <div>
          <label>Email:</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div>
          <label>Password:</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <button type="submit" disabled={loading}>
          {loading ? 'Logging in...' : 'Login'}
        </button>
      </form>
      <p>
        Don't have an account? <a href="/register">Register here</a>
      </p>
    </div>
  );
}