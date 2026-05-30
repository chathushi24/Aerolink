import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../../context/AuthContext';
import { API_URLS } from '../../config';

export default function AdminFlightManager() {
  const { getAxiosConfig } = useContext(AuthContext);
  const [flights, setFlights] = useState([]);
  const [flightNumber, setFlightNumber] = useState('');
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [departureTime, setDepartureTime] = useState('');
  const [arrivalTime, setArrivalTime] = useState('');
  const [price, setPrice] = useState(300);
  const [totalSeats, setTotalSeats] = useState(150);
  const [success, setSuccess] = useState('');
  const [err, setErr] = useState('');

  // Selected flight for PATCH updates
  const [selectedFlight, setSelectedFlight] = useState(null);
  const [newPrice, setNewPrice] = useState('');
  const [newDepTime, setNewDepTime] = useState('');
  const [newArrTime, setNewArrTime] = useState('');

  const fetchFlights = async () => {
    const res = await axios.get(`${API_URLS.flight}/flights`);
    setFlights(res.data);
  };

  useEffect(() => {
    fetchFlights();
  }, []);

  const handleAddFlight = async (e) => {
    e.preventDefault();
    setSuccess('');
    setErr('');

    try {
      await axios.post(`${API_URLS.flight}/flights`, {
        flight_number: flightNumber,
        origin: origin.toUpperCase(),
        destination: destination.toUpperCase(),
        departure_time: departureTime + ":00Z",
        arrival_time: arrivalTime + ":00Z",
        price: parseFloat(price),
        total_seats: parseInt(totalSeats),
        available_seats: parseInt(totalSeats),
        status: 'SCHEDULED'
      }, getAxiosConfig());

      setSuccess('Flight registered successfully!');
      fetchFlights();
      setFlightNumber('');
      setOrigin('');
      setDestination('');
      setDepartureTime('');
      setArrivalTime('');
    } catch (error) {
      setErr(error.response?.data?.detail || 'Add flight failed.');
    }
  };

  const handlePatchPrice = async () => {
    if (!newPrice) return;
    try {
      await axios.patch(`${API_URLS.flight}/flights/${selectedFlight.flight_id}/price`, {
        price: parseFloat(newPrice)
      }, getAxiosConfig());
      setSuccess('Flight price updated successfully!');
      setSelectedFlight(null);
      fetchFlights();
    } catch (error) {
      setErr(error.response?.data?.detail || 'Price update failed.');
    }
  };

  const handlePatchSchedule = async () => {
    if (!newDepTime || !newArrTime) return;
    try {
      await axios.patch(`${API_URLS.flight}/flights/${selectedFlight.flight_id}/schedule`, {
        departure_time: newDepTime + ":00Z",
        arrival_time: newArrTime + ":00Z",
        status: 'DELAYED'
      }, getAxiosConfig());
      setSuccess('Flight schedule patched successfully!');
      setSelectedFlight(null);
      fetchFlights();
    } catch (error) {
      setErr(error.response?.data?.detail || 'Schedule patch failed.');
    }
  };

  const handleDeleteFlight = async (flightId) => {
    if (!window.confirm("Are you sure you want to delete this flight route? This will prune it permanently.")) return;
    setSuccess('');
    setErr('');
    try {
      await axios.delete(`${API_URLS.flight}/flights/${flightId}`, getAxiosConfig());
      setSuccess('Flight route deleted successfully!');
      fetchFlights();
    } catch (error) {
      setErr(error.response?.data?.detail || 'Delete flight route failed.');
    }
  };

  return (
    <div className="admin-flights animated-entry" style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '2rem' }}>
      
      {/* Create Flight Panel */}
      <div className="glass-panel">
        <h2>Schedule New Route</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', fontSize: '0.85rem' }}>Register new airline sectors on the network</p>

        {success && <div className="alert success">{success}</div>}
        {err && <div className="alert error">{err}</div>}

        <form onSubmit={handleAddFlight} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="form-group">
            <label>Flight Code</label>
            <input className="glass-input" type="text" placeholder="e.g. AL305" value={flightNumber} onChange={e => setFlightNumber(e.target.value)} required />
          </div>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <div className="form-group" style={{ flex: 1 }}>
              <label>Origin IATA</label>
              <input className="glass-input" type="text" placeholder="e.g. JFK" value={origin} onChange={e => setOrigin(e.target.value)} required />
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label>Dest IATA</label>
              <input className="glass-input" type="text" placeholder="e.g. LHR" value={destination} onChange={e => setDestination(e.target.value)} required />
            </div>
          </div>
          <div className="form-group">
            <label>Departure Date/Time</label>
            <input className="glass-input" type="datetime-local" value={departureTime} onChange={e => setDepartureTime(e.target.value)} required />
          </div>
          <div className="form-group">
            <label>Arrival Date/Time</label>
            <input className="glass-input" type="datetime-local" value={arrivalTime} onChange={e => setArrivalTime(e.target.value)} required />
          </div>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <div className="form-group" style={{ flex: 1 }}>
              <label>Price ($)</label>
              <input className="glass-input" type="number" min={1} value={price} onChange={e => setPrice(e.target.value)} required />
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label>Total Seats</label>
              <input className="glass-input" type="number" min={10} value={totalSeats} onChange={e => setTotalSeats(e.target.value)} required />
            </div>
          </div>
          <button className="glass-button" type="submit">Schedule Flight</button>
        </form>
      </div>

      {/* Admin Route Catalog list */}
      <div className="glass-panel">
        <h2>Active Route Scheduler</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', fontSize: '0.85rem' }}>Apply dynamic prices or schedule alerts for passenger bookings</p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {Array.isArray(flights) && flights.map(fl => (
            <div key={fl.flight_id} style={{ display: 'flex', justifyContent: 'space-between', padding: '1rem', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-glass)', borderRadius: '8px' }}>
              <div>
                <h3>{fl.flight_number} ({fl.origin} → {fl.destination})</h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Price: ${fl.price} | Seats Left: {fl.available_seats}/{fl.total_seats}</p>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Dep: {new Date(fl.departure_time).toLocaleString([], { timeZone: 'UTC' })}</p>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <button className="glass-button secondary" style={{ padding: '0.35rem 0.7rem', fontSize: '0.8rem' }} onClick={() => { setSelectedFlight(fl); setNewPrice(fl.price); setNewDepTime(''); }}>Adjust Price</button>
                <button className="glass-button secondary" style={{ padding: '0.35rem 0.7rem', fontSize: '0.8rem' }} onClick={() => { setSelectedFlight(fl); setNewPrice(''); setNewDepTime(fl.departure_time.slice(0, 16)); setNewArrTime(fl.arrival_time.slice(0, 16)); }}>Delay Route</button>
                <button className="glass-button secondary" style={{ padding: '0.35rem 0.7rem', fontSize: '0.8rem', backgroundColor: 'rgba(239, 68, 68, 0.15)', color: 'var(--error)', borderColor: 'rgba(239, 68, 68, 0.25)' }} onClick={() => handleDeleteFlight(fl.flight_id)}>Delete Route</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Adjustments Overlay Modal */}
      {selectedFlight && (
        <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="modal-content glass-panel" style={{ maxWidth: '400px', width: '100%', margin: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
              <h2>Operational Adjustments</h2>
              <span className="close-btn" style={{ cursor: 'pointer', fontSize: '1.5rem' }} onClick={() => setSelectedFlight(null)}>×</span>
            </div>
            <p style={{ marginBottom: '1rem' }}><strong>Route:</strong> {selectedFlight.flight_number} ({selectedFlight.origin} → {selectedFlight.destination})</p>

            {newPrice !== '' ? (
              <div>
                <div className="form-group">
                  <label>Apply New Tariff ($)</label>
                  <input className="glass-input" type="number" value={newPrice} onChange={e => setNewPrice(e.target.value)} />
                </div>
                <button className="glass-button" style={{ width: '100%', marginTop: '1rem' }} onClick={handlePatchPrice}>Publish New Tariff</button>
              </div>
            ) : (
              <div>
                <div className="form-group">
                  <label>Adjust Departure Date/Time</label>
                  <input className="glass-input" type="datetime-local" value={newDepTime} onChange={e => setNewDepTime(e.target.value)} />
                </div>
                <div className="form-group">
                  <label>Adjust Arrival Date/Time</label>
                  <input className="glass-input" type="datetime-local" value={newArrTime} onChange={e => setNewArrTime(e.target.value)} />
                </div>
                <button className="glass-button" style={{ width: '100%', marginTop: '1rem' }} onClick={handlePatchSchedule}>Reschedule Sector</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
