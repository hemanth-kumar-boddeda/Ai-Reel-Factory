import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';

export default function Register() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const response = await api.post('/auth/register', {
        email,
        password
      });
      // Log in to get the access token
      const loginResponse = await api.post('/auth/login', new URLSearchParams({ username: email, password }), {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      });
      localStorage.setItem('accessToken', loginResponse.data.access_token);
      navigate('/');
    } catch (err) {
      setLoading(false);
      if (err.response && err.response.data) {
        if (err.response.data.detail) {
          setError(err.response.data.detail);
        } else if (Array.isArray(err.response.data)) {
          // Validation errors
          setError(err.response.data.map(e => e.msg).join(', '));
        } else {
          setError('Registration failed.');
        }
      } else {
        setError('Registration failed. Please try again.');
      }
    }
  };

  return (
    <div className="page-container">
      <h1>Register</h1>
      {error && <p style={{ color: '#ff6b6b' }}>{error}</p>}
      <form onSubmit={handleSubmit} className="register-form">
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
          <label>Password (min 8 chars):</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
          />
        </div>
        <button type="submit" disabled={loading}>
          {loading ? 'Registering...' : 'Register'}
        </button>
      </form>
      <p>
        Already have an account? <a href="/login">Login here</a>
      </p>
    </div>
  );
}