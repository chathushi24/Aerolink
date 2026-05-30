import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { AuthContext } from './context/AuthContext';
import { API_URLS } from './config';

// Import passenger components
import AuthPanel from './components/passenger/AuthPanel';
import FlightCatalog from './components/passenger/FlightCatalog';
import PassengerBookings from './components/passenger/PassengerBookings';
import BaggageTracking from './components/passenger/BaggageTracking';
import NotificationLogs from './components/passenger/NotificationLogs';

// Import service administration components
import AdminDashboardPanel from './components/service_administration/AdminDashboardPanel';
import AdminFlightCatalog from './components/service_administration/AdminFlightCatalog';
import AdminFlightManager from './components/service_administration/AdminFlightManager';
import AdminBaggageManager from './components/service_administration/AdminBaggageManager';

export default function App() {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [activeTab, setActiveTab] = useState('flights'); // flights, bookings, baggage, notifications, admin_dashboard, admin_flights, admin_baggage
  const [authView, setAuthView] = useState('login'); // login, register

  // Global Administration States
  const [campaigns, setCampaigns] = useState(() => {
    const saved = localStorage.getItem('campaigns');
    return saved ? JSON.parse(saved) : [
      { id: 'c1', name: 'Autumn Cherry Blossom Special', discount: 15, target: 'NRT', status: 'ACTIVE' },
      { id: 'c2', name: 'London Winter Festive Tour', discount: 10, target: 'LHR', status: 'ACTIVE' },
      { id: 'c3', name: 'Lahore Spring Festival Offer', discount: 20, target: 'LHE', status: 'ACTIVE' }
    ];
  });

  const [airlines, setAirlines] = useState(() => {
    const saved = localStorage.getItem('airlines');
    return saved ? JSON.parse(saved) : [
      { code: 'AL_MAIN', name: 'AeroLink Mainline', fleetSize: 42, status: 'ACTIVE' },
      { code: 'AL_EXP', name: 'AeroLink Express', fleetSize: 18, status: 'ACTIVE' },
      { code: 'AL_CARGO', name: 'AeroLink Cargo', fleetSize: 8, status: 'ACTIVE' },
      { code: 'TG_AIR', name: 'TransGlobal Airlines (Partner)', fleetSize: 24, status: 'MAINTENANCE' },
      { code: 'EF_AW', name: 'EuroFlight Airways (Partner)', fleetSize: 12, status: 'GROUNDED' }
    ];
  });

  const [sectors, setSectors] = useState(() => {
    const saved = localStorage.getItem('sectors');
    return saved ? JSON.parse(saved) : [
      { code: 'JFK', city: 'New York', country: 'United States' },
      { code: 'LHR', city: 'London', country: 'United Kingdom' },
      { code: 'NRT', city: 'Tokyo', country: 'Japan' },
      { code: 'ORD', city: 'Chicago', country: 'United States' },
      { code: 'LAX', city: 'Los Angeles', country: 'United States' },
      { code: 'LHE', city: 'Lahore', country: 'Pakistan' },
      { code: 'DXB', city: 'Dubai', country: 'United Arab Emirates' },
      { code: 'SIN', city: 'Singapore', country: 'Singapore' },
      { code: 'CDG', city: 'Paris', country: 'France' }
    ];
  });

  const [consoleLogs, setConsoleLogs] = useState([
    { time: '11:32:01', tag: 'immigration', msg: 'Clearance approved: Passenger John Doe (US-3829) for flight AL101.' },
    { time: '11:32:05', tag: 'payment', msg: 'Stripe mock transaction succeeded: Billed $1,240.00 to Card VISA_TEST.' },
    { time: '11:32:06', tag: 'eventbridge', msg: 'Event [BookingCreated] dispatched to SQS queues [FlightSeats, PaymentGateway].' },
    { time: '11:32:08', tag: 'flight', msg: 'Asynchronously updated DynamoDB dev-FlightsTable. Decremented 2 seats.' },
    { time: '11:32:10', tag: 'baggage', msg: 'Baggage auto-initialized for booking. Bag bag-9f201e loaded at JFK.' }
  ]);

  // Local storage persistence effects
  useEffect(() => {
    localStorage.setItem('campaigns', JSON.stringify(campaigns));
  }, [campaigns]);

  useEffect(() => {
    localStorage.setItem('airlines', JSON.stringify(airlines));
  }, [airlines]);

  useEffect(() => {
    localStorage.setItem('sectors', JSON.stringify(sectors));
  }, [sectors]);

  // Simulated integrations log stream
  useEffect(() => {
    const mockEvents = [
      { tag: 'immigration', msg: 'Immigration security sweep completed for flight AL305. 0 alerts flagged.' },
      { tag: 'payment', msg: 'Processed secure mock payment: booking-UUID settled via event bus.' },
      { tag: 'eventbridge', msg: 'Event [PaymentCompleted] published. Routing to SQS Baggage and SQS Booking.' },
      { tag: 'flight', msg: 'DynamoDB FlightsTable query processed: Route JFK -> NRT updated.' },
      { tag: 'baggage', msg: 'Baggage transit scan: checked-in cargo updated at JFK_DEPARTURE_TERMINAL.' },
      { tag: 'immigration', msg: 'Security gate validation: passport scan verified for passenger.' },
      { tag: 'flight', msg: 'Airport ground control allocated Gate 24B for flight AL101.' },
      { tag: 'eventbridge', msg: 'Rule dev-AllOperationalAlertsRule triggered. Forwarded notification log.' }
    ];

    const timer = setInterval(() => {
      const randomEvent = mockEvents[Math.floor(Math.random() * mockEvents.length)];
      const now = new Date();
      const timeStr = now.toTimeString().split(' ')[0];
      setConsoleLogs(prev => [
        { time: timeStr, tag: randomEvent.tag, msg: randomEvent.msg },
        ...prev.slice(0, 49) // Keep last 50 logs
      ]);
    }, 4000);

    return () => clearInterval(timer);
  }, []);

  // Bootstrapping: Load profile if token exists
  useEffect(() => {
    if (token) {
      localStorage.setItem('token', token);
      axios.get(`${API_URLS.auth}/auth/profile`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      .then(res => {
        setUser(res.data);
        if (res.data.role === 'STAFF' || res.data.role === 'ADMIN') {
          setActiveTab('admin_dashboard');
        } else {
          setActiveTab('flights');
        }
      })
      .catch(() => {
        logout();
      });
    } else {
      localStorage.removeItem('token');
      setUser(null);
    }
  }, [token]);

  const logout = () => {
    setToken('');
    setUser(null);
    localStorage.removeItem('token');
    setActiveTab('flights');
  };

  const getAxiosConfig = () => {
    return { headers: { Authorization: `Bearer ${token}` } };
  };

  return (
    <AuthContext.Provider value={{ 
      user, token, setToken, logout, getAxiosConfig, activeTab, setActiveTab, authView, setAuthView,
      campaigns, setCampaigns, airlines, setAirlines, sectors, setSectors, consoleLogs, setConsoleLogs
    }}>
      <div className="app-container">
        {/* Modern Header Navigation */}
        <header className="main-header">
          <div className="header-brand" style={{ cursor: 'pointer' }} onClick={() => setActiveTab('flights')}>
            <span className="brand-logo">✈</span>
            <h1>AeroLink</h1>
            <span className="brand-badge">Aviation Hub</span>
          </div>

          <nav className="header-nav">
            {user ? (
              <>
                {user.role === 'PASSENGER' ? (
                  <>
                    <button className={`nav-link ${activeTab === 'flights' ? 'active' : ''}`} onClick={() => setActiveTab('flights')}>Search Flights</button>
                    <button className={`nav-link ${activeTab === 'bookings' ? 'active' : ''}`} onClick={() => setActiveTab('bookings')}>My Bookings</button>
                    <button className={`nav-link ${activeTab === 'baggage' ? 'active' : ''}`} onClick={() => setActiveTab('baggage')}>Track Baggage</button>
                    <button className={`nav-link ${activeTab === 'notifications' ? 'active' : ''}`} onClick={() => setActiveTab('notifications')}>Alerts</button>
                  </>
                ) : (
                  <>
                    <button className={`nav-link ${activeTab === 'admin_dashboard' ? 'active' : ''}`} onClick={() => setActiveTab('admin_dashboard')}>Control Tower</button>
                    <button className={`nav-link ${activeTab === 'admin_flight_catalog' ? 'active' : ''}`} onClick={() => setActiveTab('admin_flight_catalog')}>Flight Manager</button>
                    <button className={`nav-link ${activeTab === 'admin_flights' ? 'active' : ''}`} onClick={() => setActiveTab('admin_flights')}>Flight Operations</button>
                    <button className={`nav-link ${activeTab === 'admin_baggage' ? 'active' : ''}`} onClick={() => setActiveTab('admin_baggage')}>Cargo Scanner</button>
                  </>
                )}
                <div className="user-indicator">
                  <span>{user.name} ({user.role})</span>
                  <button className="glass-button secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }} onClick={logout}>Sign Out</button>
                </div>
              </>
            ) : (
              <div className="auth-buttons">
                <button className={`nav-link ${authView === 'login' ? 'active' : ''}`} onClick={() => { setAuthView('login'); setActiveTab('auth'); }}>Sign In</button>
                <button className="glass-button" style={{ padding: '0.5rem 1rem' }} onClick={() => { setAuthView('register'); setActiveTab('auth'); }}>Register</button>
              </div>
            )}
          </nav>
        </header>

        {/* Core Layout Panels */}
        <main className="main-content">
          {activeTab === 'auth' && (
            <AuthPanel authView={authView} setAuthView={setAuthView} />
          )}

          {activeTab === 'flights' && <FlightCatalog />}
          {activeTab === 'bookings' && <PassengerBookings />}
          {activeTab === 'baggage' && <BaggageTracking />}
          {activeTab === 'notifications' && <NotificationLogs />}
          
          {activeTab === 'admin_dashboard' && <AdminDashboardPanel />}
          {activeTab === 'admin_flight_catalog' && <AdminFlightCatalog />}
          {activeTab === 'admin_flights' && <AdminFlightManager />}
          {activeTab === 'admin_baggage' && <AdminBaggageManager />}
        </main>

        <footer className="main-footer">
          <p>© 2026 AeroLink Platforms. Managed and Scaled via AWS EKS & EventBridge.</p>
        </footer>
      </div>
    </AuthContext.Provider>
  );
}
