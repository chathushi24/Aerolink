import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../../context/AuthContext';
import { API_URLS } from '../../config';

export default function PassengerBookings() {
  const { user, getAxiosConfig } = useContext(AuthContext);
  const [bookings, setBookings] = useState([]);

  useEffect(() => {
    if (user) {
      axios.get(`${API_URLS.booking}/bookings/passenger/${user.user_id}`, getAxiosConfig())
        .then(res => setBookings(res.data))
        .catch(err => console.error("Failed loading user bookings", err));
    }
  }, [user]);

  return (
    <div className="passenger-bookings animated-entry glass-panel">
      <h2>My Flight Bookings</h2>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>Manage your operational ticket details and receipts</p>

      {bookings.length === 0 ? (
        <p>No bookings found. Head to 'Search Flights' to make your first booking.</p>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-glass)' }}>
                <th style={{ padding: '1rem' }}>Booking ID</th>
                <th style={{ padding: '1rem' }}>Flight ID</th>
                <th style={{ padding: '1rem' }}>Seats Reserved</th>
                <th style={{ padding: '1rem' }}>Booking Status</th>
                <th style={{ padding: '1rem' }}>Payment Status</th>
                <th style={{ padding: '1rem' }}>Date Booked</th>
              </tr>
            </thead>
            <tbody>
              {Array.isArray(bookings) && bookings.map(bk => (
                <tr key={bk.booking_id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <td style={{ padding: '1rem', fontFamily: 'monospace', fontSize: '0.8rem' }}>{bk.booking_id}</td>
                  <td style={{ padding: '1rem', fontFamily: 'monospace', fontSize: '0.8rem' }}>{bk.flight_id}</td>
                  <td style={{ padding: '1rem' }}>{bk.seat_count}</td>
                  <td style={{ padding: '1rem' }}>
                    <span className={`badge ${bk.booking_status.toLowerCase()}`}>{bk.booking_status}</span>
                  </td>
                  <td style={{ padding: '1rem' }}>
                    <span className={`badge ${bk.payment_status.toLowerCase()}`}>{bk.payment_status}</span>
                  </td>
                  <td style={{ padding: '1rem', fontSize: '0.85rem' }}>{new Date(bk.created_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
