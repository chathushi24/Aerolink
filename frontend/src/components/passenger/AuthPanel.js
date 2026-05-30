import React, { useState, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../../context/AuthContext';
import { API_URLS } from '../../config';

export default function AuthPanel({ authView, setAuthView }) {
  const { setToken, setActiveTab } = useContext(AuthContext);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('PASSENGER');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      if (authView === 'register') {
        await axios.post(`${API_URLS.auth}/auth/register`, { name, email, password, role });
        setSuccess('Registration successful! Please login.');
        setAuthView('login');
        setPassword('');
      } else {
        const res = await axios.post(`${API_URLS.auth}/auth/login`, { email, password });
        setToken(res.data.access_token);
        if (res.data.role === 'STAFF' || res.data.role === 'ADMIN') {
          setActiveTab('admin_flights');
        } else {
          setActiveTab('flights');
        }
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Authentication operation failed.');
    }
  };

  return (
    <div className="auth-wrapper glass-panel animated-entry" style={{ maxWidth: '450px', margin: '3rem auto', position: 'relative' }}>
      <button 
        className="glass-button secondary" 
        style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem', marginBottom: '1.5rem', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
        onClick={() => setActiveTab('flights')}
      >
        ← Back to Flights
      </button>
      <h2>{authView === 'login' ? 'Welcome Back' : 'Create AeroLink Account'}</h2>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
        {authView === 'login' ? 'Access your flight itineraries and luggage logs' : 'Register for global flight tickets'}
      </p>

      {error && <div className="alert error">{error}</div>}
      {success && <div className="alert success">{success}</div>}

      <form onSubmit={handleSubmit} className="auth-form">
        {authView === 'register' && (
          <div className="form-group">
            <label>Name</label>
            <input className="glass-input" type="text" value={name} onChange={e => setName(e.target.value)} required placeholder="John Doe" />
          </div>
        )}
        <div className="form-group">
          <label>Email Address</label>
          <input className="glass-input" type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="user@aerolink.com" />
        </div>
        <div className="form-group">
          <label>Secure Password</label>
          <input className="glass-input" type="password" value={password} onChange={e => setPassword(e.target.value)} required placeholder="••••••••" />
        </div>
        {authView === 'register' && (
          <div className="form-group">
            <label>Account Role</label>
            <select className="glass-input" value={role} onChange={e => setRole(e.target.value)}>
              <option value="PASSENGER">Passenger</option>
              <option value="STAFF">Airline Staff</option>
              <option value="ADMIN">System Administrator</option>
            </select>
          </div>
        )}

        <button className="glass-button" type="submit" style={{ width: '100%', marginTop: '1rem' }}>
          {authView === 'login' ? 'Sign In' : 'Register Account'}
        </button>
      </form>

      <div className="auth-toggle">
        {authView === 'login' ? (
          <p>New to AeroLink? <span onClick={() => setAuthView('register')}>Register Here</span></p>
        ) : (
          <p>Already registered? <span onClick={() => setAuthView('login')}>Sign In Here</span></p>
        )}
      </div>
    </div>
  );
}
