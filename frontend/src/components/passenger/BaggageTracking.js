import React, { useState, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../../context/AuthContext';
import { API_URLS } from '../../config';

export default function BaggageTracking() {
  const { getAxiosConfig } = useContext(AuthContext);
  const [bookingId, setBookingId] = useState('');
  const [baggageLogs, setBaggageLogs] = useState([]);
  const [error, setError] = useState('');

  const handleTrack = async (e) => {
    e.preventDefault();
    setError('');
    setBaggageLogs([]);
    
    if (!bookingId) return;

    try {
      const res = await axios.get(`${API_URLS.baggage}/baggage/${bookingId}`, getAxiosConfig());
      setBaggageLogs(res.data);
      if (res.data.length === 0) {
        setError('No checked baggage found for this booking ID.');
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Baggage search failed.');
    }
  };

  return (
    <div className="baggage-tracking animated-entry glass-panel" style={{ maxWidth: '700px', margin: '2rem auto' }}>
      <h2>Baggage Barcode Transit Tracker</h2>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>Track the real-time operational status of your cargo luggage</p>

      <form onSubmit={handleTrack} style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
        <input className="glass-input" type="text" placeholder="Enter Booking ID (e.g. usr-booking-UUID)" value={bookingId} onChange={e => setBookingId(e.target.value)} required />
        <button className="glass-button" type="submit">Track Cargo</button>
      </form>

      {error && <div className="alert error">{error}</div>}

      {Array.isArray(baggageLogs) && baggageLogs.map(bag => (
        <div key={bag.baggage_id} className="bag-status-card" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-glass)', borderRadius: '12px', padding: '1.5rem', marginTop: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <span><strong>Bag Reference:</strong> {bag.baggage_id}</span>
            <span><strong>Last Scanned:</strong> {new Date(bag.last_updated).toLocaleTimeString()}</span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h3>Transit Point: <span style={{ color: 'var(--accent-primary)' }}>{bag.location}</span></h3>
            <span className={`badge ${bag.current_status.toLowerCase()}`}>{bag.current_status}</span>
          </div>

          {/* Interactive visual progress tracker */}
          <div className="visual-progress" style={{ display: 'flex', justifyContent: 'space-between', position: 'relative', marginTop: '2rem' }}>
            <div className="progress-bar" style={{ position: 'absolute', top: '10px', left: '0', right: '0', height: '4px', background: 'rgba(255,255,255,0.1)', zIndex: 1 }}>
              <div className="progress-fill" style={{ 
                height: '100%', 
                background: 'var(--accent-gradient)', 
                width: 
                  bag.current_status === 'CHECKED_IN' ? '0%' :
                  bag.current_status === 'SORTING' ? '25%' :
                  bag.current_status === 'IN_TRANSIT' ? '50%' :
                  bag.current_status === 'ARRIVED' ? '75%' : '100%',
                transition: 'width 0.5s ease-in-out'
              }}></div>
            </div>
            
            {['CHECKED_IN', 'SORTING', 'IN_TRANSIT', 'ARRIVED', 'CLAIMED'].map((st, i) => {
              const stages = ['CHECKED_IN', 'SORTING', 'IN_TRANSIT', 'ARRIVED', 'CLAIMED'];
              const currentIdx = stages.indexOf(bag.current_status);
              const isActive = i <= currentIdx;
              
              return (
                <div key={st} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 2 }}>
                  <div className="dot" style={{ 
                    width: '24px', 
                    height: '24px', 
                    borderRadius: '50%', 
                    background: isActive ? 'var(--accent-primary)' : '#1e293b', 
                    border: '2px solid rgba(255,255,255,0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.7rem',
                    fontWeight: 'bold'
                  }}>{isActive ? '✓' : ''}</div>
                  <span style={{ fontSize: '0.75rem', marginTop: '0.5rem', color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)' }}>{st.replace('_', ' ')}</span>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
