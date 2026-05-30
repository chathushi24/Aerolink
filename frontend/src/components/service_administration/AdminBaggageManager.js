import React, { useState, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../../context/AuthContext';
import { API_URLS } from '../../config';

export default function AdminBaggageManager() {
  const { getAxiosConfig } = useContext(AuthContext);
  const [baggageId, setBaggageId] = useState('');
  const [bagInfo, setBagInfo] = useState(null);
  const [newStatus, setNewStatus] = useState('SORTING');
  const [newLocation, setNewLocation] = useState('');
  const [success, setSuccess] = useState('');
  const [err, setErr] = useState('');

  const handleFetchBag = async (e) => {
    e.preventDefault();
    setSuccess('');
    setErr('');
    setBagInfo(null);

    try {
      // Direct DynamoDB lookup by bag ref or booking ID. Since GET /baggage/{booking_id} returns an array, we can query by booking, 
      // or staff can query directly if they know the bag barcode reference. Let's make it fetch via booking_id for easy demonstration.
      const res = await axios.get(`${API_URLS.baggage}/baggage/${baggageId}`, getAxiosConfig());
      if (res.data.length === 0) {
        setErr('No cargo luggage found matching this Booking ID.');
      } else {
        setBagInfo(res.data[0]); // Load the first bag
        setNewStatus(res.data[0].current_status);
        setNewLocation(res.data[0].location);
      }
    } catch (error) {
      setErr('Luggage query failed.');
    }
  };

  const handleUpdateStatus = async () => {
    setSuccess('');
    setErr('');
    try {
      const res = await axios.patch(`${API_URLS.baggage}/baggage/${bagInfo.baggage_id}/status`, {
        current_status: newStatus,
        location: newLocation
      }, getAxiosConfig());

      setSuccess('Baggage status updated and published to EventBridge!');
      setBagInfo(res.data);
    } catch (error) {
      setErr('Status update failed.');
    }
  };

  return (
    <div className="admin-baggage animated-entry glass-panel" style={{ maxWidth: '600px', margin: '2rem auto' }}>
      <h2>Ground Operations Cargo Dashboard</h2>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>Scan and re-route checked baggage barcodes inside the terminal</p>

      {success && <div className="alert success">{success}</div>}
      {err && <div className="alert error">{err}</div>}

      <form onSubmit={handleFetchBag} style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
        <input className="glass-input" type="text" placeholder="Scan Booking ID (e.g. usr-booking-UUID)" value={baggageId} onChange={e => setBaggageId(e.target.value)} required />
        <button className="glass-button" type="submit">Scan Barcode</button>
      </form>

      {bagInfo && (
        <div style={{ padding: '1.5rem', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-glass)', borderRadius: '12px' }}>
          <h3>Luggage Reference: <span style={{ fontFamily: 'monospace', color: 'var(--accent-primary)' }}>{bagInfo.baggage_id}</span></h3>
          <p style={{ margin: '0.5rem 0', color: 'var(--text-secondary)' }}>Passenger ID: {bagInfo.passenger_id}</p>
          <hr style={{ border: 'none', borderBottom: '1px solid var(--border-glass)', margin: '1rem 0' }} />

          <div className="form-group">
            <label>Cargo Routing Status</label>
            <select className="glass-input" value={newStatus} onChange={e => setNewStatus(e.target.value)}>
              <option value="CHECKED_IN">CHECKED_IN</option>
              <option value="SORTING">SORTING</option>
              <option value="IN_TRANSIT">IN_TRANSIT</option>
              <option value="ARRIVED">ARRIVED</option>
              <option value="CLAIMED">CLAIMED</option>
            </select>
          </div>

          <div className="form-group">
            <label>Current Physical Location</label>
            <input className="glass-input" type="text" value={newLocation} onChange={e => setNewLocation(e.target.value)} placeholder="e.g. CARGO_BAY_3" required />
          </div>

          <button className="glass-button" style={{ width: '100%', marginTop: '1rem' }} onClick={handleUpdateStatus}>Publish Cargo Routing Updates</button>
        </div>
      )}
    </div>
  );
}
