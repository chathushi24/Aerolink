import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../../context/AuthContext';
import { API_URLS } from '../../config';

export default function AdminFlightCatalog() {
  const { getAxiosConfig } = useContext(AuthContext);
  const [flights, setFlights] = useState([]);
  const [success, setSuccess] = useState('');
  const [err, setErr] = useState('');

  // Form states for creating a new flight
  const [flightNumber, setFlightNumber] = useState('');
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [departureTime, setDepartureTime] = useState('');
  const [arrivalTime, setArrivalTime] = useState('');
  const [price, setPrice] = useState(300);
  const [totalSeats, setTotalSeats] = useState(150);

  // Edit Mode states
  const [editingFlight, setEditingFlight] = useState(null);
  const [editFlightNumber, setEditFlightNumber] = useState('');
  const [editOrigin, setEditOrigin] = useState('');
  const [editDestination, setEditDestination] = useState('');
  const [editDepartureTime, setEditDepartureTime] = useState('');
  const [editArrivalTime, setEditArrivalTime] = useState('');
  const [editPrice, setEditPrice] = useState(300);
  const [editTotalSeats, setEditTotalSeats] = useState(150);
  const [editStatus, setEditStatus] = useState('SCHEDULED');

  const fetchFlights = async () => {
    try {
      const res = await axios.get(`${API_URLS.flight}/flights`);
      setFlights(res.data);
    } catch (error) {
      setErr('Failed to load current available flights.');
    }
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
        origin: origin.toUpperCase().trim(),
        destination: destination.toUpperCase().trim(),
        departure_time: departureTime + ":00Z",
        arrival_time: arrivalTime + ":00Z",
        price: parseFloat(price),
        total_seats: parseInt(totalSeats),
        available_seats: parseInt(totalSeats),
        status: 'SCHEDULED'
      }, getAxiosConfig());

      setSuccess('New flight added to catalog successfully!');
      fetchFlights();
      // Reset form
      setFlightNumber('');
      setOrigin('');
      setDestination('');
      setDepartureTime('');
      setArrivalTime('');
      setPrice(300);
      setTotalSeats(150);
    } catch (error) {
      setErr(error.response?.data?.detail || 'Failed to add new flight.');
    }
  };

  const handleDeleteFlight = async (flightId) => {
    if (!window.confirm("Are you sure you want to permanently delete this flight from the catalog? This cannot be undone.")) return;
    setSuccess('');
    setErr('');
    try {
      await axios.delete(`${API_URLS.flight}/flights/${flightId}`, getAxiosConfig());
      setSuccess('Flight deleted successfully!');
      fetchFlights();
    } catch (error) {
      setErr(error.response?.data?.detail || 'Failed to delete flight.');
    }
  };

  const startEdit = (fl) => {
    setEditingFlight(fl);
    setEditFlightNumber(fl.flight_number);
    setEditOrigin(fl.origin);
    setEditDestination(fl.destination);
    setEditDepartureTime(fl.departure_time.slice(0, 16));
    setEditArrivalTime(fl.arrival_time.slice(0, 16));
    setEditPrice(fl.price);
    setEditTotalSeats(fl.total_seats);
    setEditStatus(fl.status);
    setSuccess('');
    setErr('');
  };

  const handleUpdateFlight = async (e) => {
    e.preventDefault();
    setSuccess('');
    setErr('');

    try {
      await axios.put(`${API_URLS.flight}/flights/${editingFlight.flight_id}`, {
        flight_number: editFlightNumber,
        origin: editOrigin.toUpperCase().trim(),
        destination: editDestination.toUpperCase().trim(),
        departure_time: editDepartureTime + ":00Z",
        arrival_time: editArrivalTime + ":00Z",
        price: parseFloat(editPrice),
        total_seats: parseInt(editTotalSeats),
        available_seats: parseInt(editTotalSeats),
        status: editStatus
      }, getAxiosConfig());

      setSuccess('Flight details modified successfully!');
      setEditingFlight(null);
      fetchFlights();
    } catch (error) {
      setErr(error.response?.data?.detail || 'Failed to modify flight details.');
    }
  };

  return (
    <div className="admin-flight-manager-catalog animated-entry" style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '2rem' }}>
      
      {/* Left Column: Form to Add a New Flight */}
      <div className="glass-panel" style={{ height: 'fit-content' }}>
        <h2>Add New Airline Flight</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', fontSize: '0.85rem' }}>Create a completely new flight sector in the global database</p>

        {success && <div className="alert success">{success}</div>}
        {err && <div className="alert error">{err}</div>}

        <form onSubmit={handleAddFlight} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="form-group">
            <label>Flight Code</label>
            <input className="glass-input" type="text" placeholder="e.g. CMB102" value={flightNumber} onChange={e => setFlightNumber(e.target.value)} required />
          </div>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <div className="form-group" style={{ flex: 1 }}>
              <label>Origin</label>
              <input className="glass-input" type="text" placeholder="e.g. CMB" value={origin} onChange={e => setOrigin(e.target.value)} required />
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label>Destination</label>
              <input className="glass-input" type="text" placeholder="e.g. DXB" value={destination} onChange={e => setDestination(e.target.value)} required />
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
              <label>Standard Price ($)</label>
              <input className="glass-input" type="number" min={1} value={price} onChange={e => setPrice(e.target.value)} required />
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label>Total Seats</label>
              <input className="glass-input" type="number" min={10} value={totalSeats} onChange={e => setTotalSeats(e.target.value)} required />
            </div>
          </div>
          <button className="glass-button" type="submit">Add Flight to Catalog</button>
        </form>
      </div>

      {/* Right Column: List of Current Flights Available with Edit/Delete Actions */}
      <div className="glass-panel">
        <h2>Current Available Flights</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', fontSize: '0.85rem' }}>View, modify details, or permanently delete flights in the system</p>

        {flights.length === 0 ? (
          <p>No flights registered yet.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {flights.map(fl => (
              <div key={fl.flight_id} style={{ display: 'flex', justifyContent: 'space-between', padding: '1.25rem', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-glass)', borderRadius: '12px', alignItems: 'center' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
                    <span className="flight-number" style={{ padding: '0.15rem 0.5rem', fontSize: '0.9rem' }}>{fl.flight_number}</span>
                    <strong style={{ fontSize: '1.1rem' }}>{fl.origin} → {fl.destination}</strong>
                    <span className={`flight-status ${fl.status.toLowerCase()}`} style={{ padding: '0.15rem 0.5rem', fontSize: '0.7rem' }}>{fl.status}</span>
                  </div>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    Price: <strong>${fl.price}</strong> | Capacity: <strong>{fl.available_seats}/{fl.total_seats} seats</strong>
                  </p>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                    Dep: {new Date(fl.departure_time).toLocaleString([], { timeZone: 'UTC' })}
                  </p>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    Arr: {new Date(fl.arrival_time).toLocaleString([], { timeZone: 'UTC' })}
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button className="glass-button secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }} onClick={() => startEdit(fl)}>Modify</button>
                  <button className="glass-button secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', backgroundColor: 'rgba(239, 68, 68, 0.15)', color: 'var(--error)', borderColor: 'rgba(239, 68, 68, 0.25)' }} onClick={() => handleDeleteFlight(fl.flight_id)}>Delete</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modify/Edit Flight Modal Overlay */}
      {editingFlight && (
        <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="modal-content glass-panel" style={{ maxWidth: '500px', width: '100%', margin: '1rem', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem', alignItems: 'center' }}>
              <h2>Modify Flight Details</h2>
              <span className="close-btn" style={{ cursor: 'pointer', fontSize: '1.5rem' }} onClick={() => setEditingFlight(null)}>×</span>
            </div>

            <form onSubmit={handleUpdateFlight} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="form-group">
                <label>Flight Code</label>
                <input className="glass-input" type="text" value={editFlightNumber} onChange={e => setEditFlightNumber(e.target.value)} required />
              </div>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <div className="form-group" style={{ flex: 1 }}>
                  <label>Origin</label>
                  <input className="glass-input" type="text" value={editOrigin} onChange={e => setEditOrigin(e.target.value)} required />
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label>Destination</label>
                  <input className="glass-input" type="text" value={editDestination} onChange={e => setEditDestination(e.target.value)} required />
                </div>
              </div>
              <div className="form-group">
                <label>Departure Date/Time</label>
                <input className="glass-input" type="datetime-local" value={editDepartureTime} onChange={e => setEditDepartureTime(e.target.value)} required />
              </div>
              <div className="form-group">
                <label>Arrival Date/Time</label>
                <input className="glass-input" type="datetime-local" value={editArrivalTime} onChange={e => setEditArrivalTime(e.target.value)} required />
              </div>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <div className="form-group" style={{ flex: 1 }}>
                  <label>Price ($)</label>
                  <input className="glass-input" type="number" min={1} value={editPrice} onChange={e => setEditPrice(e.target.value)} required />
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label>Total Seats</label>
                  <input className="glass-input" type="number" min={10} value={editTotalSeats} onChange={e => setEditTotalSeats(e.target.value)} required />
                </div>
              </div>
              <div className="form-group">
                <label>Flight Operational Status</label>
                <select className="glass-input" value={editStatus} onChange={e => setEditStatus(e.target.value)}>
                  <option value="SCHEDULED">SCHEDULED</option>
                  <option value="DELAYED">DELAYED</option>
                  <option value="DEPARTED">DEPARTED</option>
                  <option value="CANCELLED">CANCELLED</option>
                </select>
              </div>
              <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                <button className="glass-button secondary" type="button" style={{ flex: 1 }} onClick={() => setEditingFlight(null)}>Cancel</button>
                <button className="glass-button" type="submit" style={{ flex: 1 }}>Save Modifications</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
