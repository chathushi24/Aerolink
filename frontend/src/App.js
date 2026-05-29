import React, { useState, useEffect, createContext, useContext } from 'react';
import axios from 'axios';

// Detect if running on localhost for local development fallback
const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

// API BASE URL Config (Dynamic pathing for AWS ALB Ingress routing)
const API_URLS = {
  auth: isLocalhost ? 'http://localhost:8001' : '',
  flight: isLocalhost ? 'http://localhost:8002' : '',
  booking: isLocalhost ? 'http://localhost:8003' : '',
  payment: isLocalhost ? 'http://localhost:8004' : '',
  baggage: isLocalhost ? 'http://localhost:8005' : '',
  notification: isLocalhost ? 'http://localhost:8006' : '',
};

// Global User Authentication Context
const AuthContext = createContext(null);

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

/* ==========================================================================
   COMPONENT: AUTHENTICATION (Login / Register)
   ========================================================================== */
function AuthPanel({ authView, setAuthView }) {
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

/* ==========================================================================
   COMPONENT: FLIGHT SEARCH & BOOKING CHECKOUT
   ========================================================================== */
function FlightCatalog() {
  const { user, getAxiosConfig, setActiveTab, setAuthView, campaigns } = useContext(AuthContext);
  const [flights, setFlights] = useState([]);
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [date, setDate] = useState('');
  
  // Booking checkout flow state
  const [selectedFlight, setSelectedFlight] = useState(null);
  const [seatsToBook, setSeatsToBook] = useState(1);
  const [checkoutStep, setCheckoutStep] = useState('detail'); // detail, payment, success
  const [cardToken, setCardToken] = useState('tok_mastercard'); // test card tokens
  const [bookingErr, setBookingErr] = useState('');
  const [bookingSuccessId, setBookingSuccessId] = useState('');

  const getDiscountedPrice = (flight) => {
    if (!campaigns) return { price: flight.price, discount: 0 };
    const activeCampaigns = campaigns.filter(c => c.status === 'ACTIVE' && c.target.toUpperCase() === flight.destination.toUpperCase());
    if (activeCampaigns.length > 0) {
      const discount = activeCampaigns[0].discount;
      return {
        price: parseFloat((flight.price * (1 - discount / 100)).toFixed(2)),
        discount,
        campaignName: activeCampaigns[0].name
      };
    }
    return { price: flight.price, discount: 0 };
  };

  const fetchFlights = async () => {
    try {
      let url = `${API_URLS.flight}/flights`;
      const params = [];
      if (origin) params.push(`origin=${origin.toUpperCase()}`);
      if (destination) params.push(`destination=${destination.toUpperCase()}`);
      if (date) params.push(`date=${date}`);
      if (params.length) url += `?${params.join('&')}`;

      const res = await axios.get(url);
      setFlights(res.data);
    } catch (err) {
      console.error("Failed fetching flight list", err);
    }
  };

  useEffect(() => {
    fetchFlights();
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    fetchFlights();
  };

  const startBooking = (flight) => {
    if (!user) {
      alert("Please login or register to book a flight ticket!");
      return;
    }
    setSelectedFlight(flight);
    setCheckoutStep('detail');
    setBookingErr('');
  };

  const handlePlaceReservation = async () => {
    setBookingErr('');
    try {
      // 1. POST /bookings to booking-service
      const res = await axios.post(`${API_URLS.booking}/bookings`, {
        passenger_id: user.user_id,
        flight_id: selectedFlight.flight_id,
        seat_count: parseInt(seatsToBook)
      }, getAxiosConfig());
      
      const bookingData = res.data;
      setBookingSuccessId(bookingData.booking_id);
      
      // Move to Payment screen
      setCheckoutStep('payment');
    } catch (err) {
      setBookingErr(err.response?.data?.detail || "Could not complete flight booking reservation.");
    }
  };

  const handleCheckoutPayment = async () => {
    setBookingErr('');
    try {
      // Synchronous Stripe Mock Charge
      const mockAmount = selectedFlight.price * seatsToBook;
      await axios.post(`${API_URLS.payment}/payments`, {
        booking_id: bookingSuccessId,
        amount: mockAmount,
        payment_method: 'VISA_TEST',
        card_token: cardToken
      }, getAxiosConfig());

      setCheckoutStep('success');
    } catch (err) {
      setBookingErr(err.response?.data?.detail || "Card authorization failed.");
    }
  };

  return (
    <div className="flights-catalog animated-entry">
      {/* Premium Hero Banner */}
      <div className="hero-banner">
        <div className="hero-bg" style={{ backgroundImage: 'url(/airplane_hero.png)' }}></div>
        <div className="hero-overlay"></div>
        <div className="hero-content">
          <h2>Elevate Your Journey</h2>
          <p>Experience signature high-altitude comfort, global destination mapping, and instant checked-baggage transit intelligence. Designed for the modern elite traveler.</p>
          <div className="hero-badges">
            <div className="hero-badge-item">
              <span className="hero-badge-icon">✓</span> 5-Star Comfort
            </div>
            <div className="hero-badge-item">
              <span className="hero-badge-icon">✓</span> Smart SQS Tracking
            </div>
            <div className="hero-badge-item">
              <span className="hero-badge-icon">✓</span> Flexible Sectors
            </div>
          </div>
        </div>
      </div>

      {/* Floating Flight Search Panel */}
      <div className="search-widget-container">
        <form onSubmit={handleSearch} className="search-bar" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr)) 120px', gap: '1.25rem', alignItems: 'center' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label style={{ fontSize: '0.8rem' }}>Origin City/Airport</label>
            <input className="glass-input" type="text" placeholder="e.g. New York or JFK" value={origin} onChange={e => setOrigin(e.target.value)} />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label style={{ fontSize: '0.8rem' }}>Destination City/Airport</label>
            <input className="glass-input" type="text" placeholder="e.g. London or LHR" value={destination} onChange={e => setDestination(e.target.value)} />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label style={{ fontSize: '0.8rem' }}>Travel Date</label>
            <input className="glass-input" type="date" value={date} onChange={e => setDate(e.target.value)} />
          </div>
          <button className="glass-button" type="submit" style={{ alignSelf: 'end', height: '48px' }}>Search</button>
        </form>
      </div>

      {/* Flights Grid Header */}
      <div className="section-title">
        <h2>Global Route Network</h2>
        <p>Real-time sector listings across available global destinations</p>
      </div>

      {/* Flights Listing Cards */}
      <div className="flights-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
        {Array.isArray(flights) && flights.map(fl => {
          const campaignData = getDiscountedPrice(fl);
          const hasDiscount = campaignData.discount > 0;
          return (
            <div key={fl.flight_id} className="flight-card">
              <div className="flight-card-header">
                <span className="flight-number">{fl.flight_number}</span>
                <span className={`flight-status ${fl.status.toLowerCase()}`}>{fl.status}</span>
              </div>
              <div className="flight-route">
                <div className="route-point">
                  <h3>{fl.origin}</h3>
                  <p>{new Date(fl.departure_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                </div>
                <div className="route-connector">
                  <span className="plane-icon">✈</span>
                  <div className="connector-line"></div>
                </div>
                <div className="route-point">
                  <h3>{fl.destination}</h3>
                  <p>{new Date(fl.arrival_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                </div>
              </div>
              <div className="flight-details-row">
                <div>
                  <span className="label">Date</span>
                  <p style={{ fontSize: '0.9rem' }}>{new Date(fl.departure_time).toLocaleDateString()}</p>
                </div>
                <div>
                  <span className="label">Available Seats</span>
                  <p style={{ fontSize: '0.9rem', color: fl.available_seats < 10 ? 'var(--error)' : 'var(--success)' }}>{fl.available_seats} / {fl.total_seats}</p>
                </div>
              </div>
              <div className="flight-card-footer">
                <h2 className="price">
                  {hasDiscount && (
                    <span className="original-price">{fl.price}</span>
                  )}
                  {campaignData.price}
                  {hasDiscount && (
                    <span className="discount-tag">{campaignData.discount}% Off SALE</span>
                  )}
                </h2>
                <button className="glass-button" onClick={() => startBooking({...fl, price: campaignData.price})} disabled={fl.available_seats === 0}>
                  {fl.available_seats === 0 ? 'Sold Out' : 'Book Ticket'}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Featured Destinations */}
      <div className="destinations-section">
        <div className="section-title">
          <h2>Inspiring Journeys</h2>
          <p>Explore our highly curated selection of premier destinations</p>
        </div>
        <div className="destinations-grid">
          <div className="destination-card">
            <div className="destination-img" style={{ backgroundImage: 'url(/tokyo_destination.png)' }}></div>
            <div className="destination-overlay"></div>
            <span className="destination-tag">Trending</span>
            <div className="destination-info">
              <h3>Tokyo, Japan</h3>
              <p className="destination-desc">A mesmerizing blend of ancient temples, neon-lit skyscrapers, and world-renowned culinary masteries.</p>
              <div className="destination-footer">
                <div className="destination-price">Fares From<span>$840</span></div>
                <button className="glass-button secondary" style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }} onClick={() => { setOrigin('JFK'); setDestination('NRT'); fetchFlights(); }}>Explore Flights</button>
              </div>
            </div>
          </div>
          <div className="destination-card">
            <div className="destination-img" style={{ backgroundImage: 'url(/cabin_crew.png)' }}></div>
            <div className="destination-overlay"></div>
            <span className="destination-tag" style={{ background: 'linear-gradient(135deg, #a855f7 0%, #ec4899 100%)' }}>Award Winning</span>
            <div className="destination-info">
              <h3>Signature Comfort</h3>
              <p className="destination-desc">Indulge in premium multi-course menus, high-speed Wi-Fi, and personalized stewardess care.</p>
              <div className="destination-footer">
                <div className="destination-price">Cabin Upgrades<span>Included</span></div>
                <button className="glass-button" style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }} onClick={() => { setActiveTab('auth'); setAuthView('register'); }}>Join Elite Club</button>
              </div>
            </div>
          </div>
          <div className="destination-card">
            <div className="destination-img" style={{ backgroundImage: 'linear-gradient(135deg, #1e1b4b 0%, #311042 100%)' }}></div>
            <div className="destination-overlay"></div>
            <span className="destination-tag">Popular</span>
            <div className="destination-info">
              <h3>London, UK</h3>
              <p className="destination-desc">Discover the historic charm, scenic royal parks, and iconic architectural marvels along the River Thames.</p>
              <div className="destination-footer">
                <div className="destination-price">Fares From<span>$620</span></div>
                <button className="glass-button secondary" style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }} onClick={() => { setOrigin('JFK'); setDestination('LHR'); fetchFlights(); }}>Explore Flights</button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quotes & Testimonials Section */}
      <div className="testimonials-section">
        <div className="section-title">
          <h2>Traveler Testimonials</h2>
          <p>Real voices from our passenger circle on their recent journeys</p>
        </div>
        <div className="testimonials-grid">
          <div className="testimonial-card glass-panel">
            <div className="rating-stars">★★★★★</div>
            <p className="testimonial-quote">"The Checked Baggage Barcode Tracker is incredibly reassuring. I knew exactly where my bags were from check-in to luggage claim. Simply outstanding!"</p>
            <div className="testimonial-author">
              <div className="author-avatar">LM</div>
              <div className="author-info">
                <h4>Lucas Miller</h4>
                <p>Verified Passenger • JFK to LHR</p>
              </div>
            </div>
          </div>
          <div className="testimonial-card glass-panel">
            <div className="rating-stars">★★★★★</div>
            <p className="testimonial-quote">"Booking premium class seats with AeroLink was a breeze. Elegant styling, clear pricing scales, and signature warm cabin care."</p>
            <div className="testimonial-author">
              <div className="author-avatar">SC</div>
              <div className="author-info">
                <h4>Sophia Chen</h4>
                <p>Business Elite Club • JFK to NRT</p>
              </div>
            </div>
          </div>
          <div className="testimonial-card glass-panel">
            <div className="rating-stars">★★★★★</div>
            <p className="testimonial-quote">"Operational rescheduling and notifications were delivered in real-time. Extremely professional ground-ops and digital platforms!"</p>
            <div className="testimonial-author">
              <div className="author-avatar">MD</div>
              <div className="author-info">
                <h4>Marcus Vance</h4>
                <p>Frequent Flyer • ORD to LAX</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Checkout Modal overlay */}
      {selectedFlight && (
        <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="modal-content glass-panel" style={{ maxWidth: '500px', width: '100%', margin: '1rem', animation: 'fadeIn 0.3s forwards' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
              <h2>Confirm Booking Reservation</h2>
              <span className="close-btn" style={{ cursor: 'pointer', fontSize: '1.5rem' }} onClick={() => setSelectedFlight(null)}>×</span>
            </div>

            {bookingErr && <div className="alert error">{bookingErr}</div>}

            {checkoutStep === 'detail' && (
              <div>
                <div style={{ padding: '1rem', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', marginBottom: '1rem' }}>
                  <h3>Flight {selectedFlight.flight_number}</h3>
                  <p>{selectedFlight.origin} → {selectedFlight.destination}</p>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Departure: {new Date(selectedFlight.departure_time).toLocaleString()}</p>
                  <p style={{ fontWeight: 'bold', marginTop: '0.5rem' }}>Ticket Fare: ${selectedFlight.price} / seat</p>
                </div>

                <div className="form-group">
                  <label>Reserve Seats Count</label>
                  <input className="glass-input" type="number" min={1} max={selectedFlight.available_seats} value={seatsToBook} onChange={e => setSeatsToBook(parseInt(e.target.value))} />
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.5rem' }}>
                  <h3>Total: ${selectedFlight.price * seatsToBook}</h3>
                  <button className="glass-button" onClick={handlePlaceReservation}>Proceed to Checkout</button>
                </div>
              </div>
            )}

            {checkoutStep === 'payment' && (
              <div>
                <div style={{ padding: '1rem', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', marginBottom: '1rem' }}>
                  <p><strong>Booking ID:</strong> {bookingSuccessId}</p>
                  <p><strong>Billed Amount:</strong> ${selectedFlight.price * seatsToBook}</p>
                </div>

                <h3>Stripe Secure Dummy payment</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1rem' }}>No actual card details are gathered or stored on servers (PCI-DSS Compliant)</p>

                <div className="form-group">
                  <label>Card Gateway Token</label>
                  <select className="glass-input" value={cardToken} onChange={e => setCardToken(e.target.value)}>
                    <option value="tok_visa">tok_visa (Test Visa Success)</option>
                    <option value="tok_mastercard">tok_mastercard (Test MasterCard Success)</option>
                    <option value="tok_fail">tok_fail (Simulate Card Declined)</option>
                  </select>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', marginTop: '1.5rem' }}>
                  <button className="glass-button secondary" style={{ flex: 1 }} onClick={() => setCheckoutStep('detail')}>Back</button>
                  <button className="glass-button" style={{ flex: 1 }} onClick={handleCheckoutPayment}>Pay & Confirm</button>
                </div>
              </div>
            )}

            {checkoutStep === 'success' && (
              <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
                <span style={{ fontSize: '4rem', color: 'var(--success)' }}>✓</span>
                <h2>Booking Ticket Confirmed!</h2>
                <p style={{ color: 'var(--text-secondary)', margin: '1rem 0' }}>Your payment succeeded. We sent booking data to EventBridge. The flight's seats and baggage tracking are initializing asynchronously.</p>
                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                  <button className="glass-button" onClick={() => { setSelectedFlight(null); setActiveTab('bookings'); }}>View Bookings</button>
                  <button className="glass-button secondary" onClick={() => { setSelectedFlight(null); setActiveTab('baggage'); }}>Track Baggage</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ==========================================================================
   COMPONENT: PASSENGER BOOKING LIST
   ========================================================================== */
function PassengerBookings() {
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

/* ==========================================================================
   COMPONENT: BAGGAGE TRACKING
   ========================================================================== */
function BaggageTracking() {
  const { user, getAxiosConfig } = useContext(AuthContext);
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

/* ==========================================================================
   COMPONENT: REAL-TIME NOTIFICATIONS LOG LIST
   ========================================================================== */
function NotificationLogs() {
  const { user, getAxiosConfig } = useContext(AuthContext);
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    if (user) {
      axios.get(`${API_URLS.notification}/notifications/${user.user_id}`, getAxiosConfig())
        .then(res => setNotifications(res.data.sort((a,b) => new Date(b.created_at) - new Date(a.created_at))))
        .catch(err => console.error("Failed loading notifications logs", err));
    }
  }, [user]);

  return (
    <div className="notifications-logs animated-entry glass-panel" style={{ maxWidth: '600px', margin: '2rem auto' }}>
      <h2>Real-Time Flight Alerts</h2>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>Automated event triggers routed via Amazon EventBridge and SQS</p>

      {notifications.length === 0 ? (
        <p>No messages gathered yet. Start a flight booking to trigger notifications.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {Array.isArray(notifications) && notifications.map(not => (
            <div key={not.notification_id} style={{ padding: '1rem', background: 'rgba(255,255,255,0.03)', borderLeft: '4px solid var(--accent-primary)', borderRadius: '0 8px 8px 0', border: '1px solid var(--border-glass)', borderLeftWidth: '4px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                <strong>{not.event_type}</strong>
                <span>{new Date(not.created_at).toLocaleTimeString()}</span>
              </div>
              <p style={{ fontSize: '0.9rem' }}>{not.message}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ==========================================================================
   COMPONENT: STAFF - MANAGE FLIGHTS
   ========================================================================== */
function AdminFlightManager() {
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
                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Dep: {new Date(fl.departure_time).toLocaleString()}</p>
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

/* ==========================================================================
   COMPONENT: STAFF - MANAGE BAGGAGE STATUS
   ========================================================================== */
function AdminBaggageManager() {
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

/* ==========================================================================
   COMPONENT: STAFF/ADMIN - CONTROL TOWER (Admin Dashboard Panel)
   ========================================================================== */
function AdminDashboardPanel() {
  const { 
    campaigns, setCampaigns, 
    airlines, setAirlines, 
    sectors, setSectors, 
    consoleLogs 
  } = useContext(AuthContext);

  // States for new Sector creation
  const [newSectorCode, setNewSectorCode] = useState('');
  const [newSectorCity, setNewSectorCity] = useState('');
  const [newSectorCountry, setNewSectorCountry] = useState('');

  // States for new Discount Campaign creation
  const [newCampaignName, setNewCampaignName] = useState('');
  const [newCampaignDiscount, setNewCampaignDiscount] = useState(15);
  const [newCampaignTarget, setNewCampaignTarget] = useState('LHR');
  
  const [successMsg, setSuccessMsg] = useState('');

  // Handler to add a new Sector
  const handleAddSector = (e) => {
    e.preventDefault();
    if (!newSectorCode || !newSectorCity || !newSectorCountry) return;
    const newSec = {
      code: newSectorCode.toUpperCase().trim(),
      city: newSectorCity.trim(),
      country: newSectorCountry.trim()
    };
    if (sectors.find(s => s.code === newSec.code)) {
      alert("Sector code already exists!");
      return;
    }
    const updated = [...sectors, newSec];
    setSectors(updated);
    setNewSectorCode('');
    setNewSectorCity('');
    setNewSectorCountry('');
    showSuccess("Sector registered successfully!");
  };

  // Handler to add a new Discount Campaign
  const handleAddCampaign = (e) => {
    e.preventDefault();
    if (!newCampaignName || !newCampaignTarget) return;
    const newCamp = {
      id: 'c_' + Date.now(),
      name: newCampaignName.trim(),
      discount: parseInt(newCampaignDiscount),
      target: newCampaignTarget.toUpperCase().trim(),
      status: 'ACTIVE'
    };
    const updated = [...campaigns, newCamp];
    setCampaigns(updated);
    setNewCampaignName('');
    setNewCampaignDiscount(15);
    setNewCampaignTarget('LHR');
    showSuccess("Seasonal discount campaign created!");
  };

  const showSuccess = (msg) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  // Toggle partner airline status
  const handleToggleAirlineStatus = (airlineCode, nextStatus) => {
    const updated = airlines.map(al => {
      if (al.code === airlineCode) {
        return { ...al, status: nextStatus };
      }
      return al;
    });
    setAirlines(updated);
  };

  // Delete Campaign
  const handleDeleteCampaign = (id) => {
    setCampaigns(campaigns.filter(c => c.id !== id));
    showSuccess("Campaign deleted.");
  };

  // Toggle Campaign status
  const handleToggleCampaignStatus = (id) => {
    const updated = campaigns.map(c => {
      if (c.id === id) {
        return { ...c, status: c.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE' };
      }
      return c;
    });
    setCampaigns(updated);
  };

  return (
    <div className="admin-dashboard-container">
      {/* Welcome & Dashboard header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '2rem' }}>AeroLink Control Tower</h2>
          <p style={{ color: 'var(--text-secondary)' }}>Global system operations, fleet statuses, active discount channels, and SQS network integrations</p>
        </div>
        {successMsg && <div className="alert success" style={{ marginBottom: 0, padding: '0.5rem 1rem' }}>{successMsg}</div>}
      </div>

      {/* KPI Cards Row */}
      <div className="kpi-row">
        <div className="kpi-card">
          <span className="kpi-title">Total Revenue</span>
          <span className="kpi-value">$7,480.00</span>
          <span className="kpi-trend positive">↑ 12.4% vs last week</span>
          <div className="sparkline-container">
            <div className="sparkbar" style={{ height: '35%' }}></div>
            <div className="sparkbar" style={{ height: '45%' }}></div>
            <div className="sparkbar" style={{ height: '60%' }}></div>
            <div className="sparkbar" style={{ height: '50%' }}></div>
            <div className="sparkbar" style={{ height: '75%' }}></div>
            <div className="sparkbar active" style={{ height: '90%' }}></div>
          </div>
        </div>

        <div className="kpi-card">
          <span className="kpi-title">Operational Bookings</span>
          <span className="kpi-value">14 Tickets</span>
          <span className="kpi-trend positive">✓ 98.4% SQS delivery success</span>
          <div className="sparkline-container">
            <div className="sparkbar" style={{ height: '40%' }}></div>
            <div className="sparkbar" style={{ height: '55%' }}></div>
            <div className="sparkbar" style={{ height: '45%' }}></div>
            <div className="sparkbar" style={{ height: '70%' }}></div>
            <div className="sparkbar active" style={{ height: '85%' }}></div>
            <div className="sparkbar active" style={{ height: '95%' }}></div>
          </div>
        </div>

        <div className="kpi-card">
          <span className="kpi-title">Sector Utilization</span>
          <span className="kpi-value">84.2%</span>
          <span className="kpi-trend neutral">→ Average occupancy stable</span>
          <div className="sparkline-container">
            <div className="sparkbar" style={{ height: '70%' }}></div>
            <div className="sparkbar" style={{ height: '75%' }}></div>
            <div className="sparkbar" style={{ height: '80%' }}></div>
            <div className="sparkbar" style={{ height: '82%' }}></div>
            <div className="sparkbar active" style={{ height: '85%' }}></div>
            <div className="sparkbar active" style={{ height: '84%' }}></div>
          </div>
        </div>

        <div className="kpi-card">
          <span className="kpi-title">AWS Service Health</span>
          <div style={{ marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem' }}>
              <span>EKS Pods</span>
              <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: 'var(--success)', boxShadow: '0 0 8px var(--success)' }}></span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem' }}>
              <span>SQS Queues</span>
              <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: 'var(--success)', boxShadow: '0 0 8px var(--success)' }}></span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem' }}>
              <span>EventBridge</span>
              <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: 'var(--success)', boxShadow: '0 0 8px var(--success)' }}></span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem' }}>
              <span>DynamoDB</span>
              <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: 'var(--success)', boxShadow: '0 0 8px var(--success)' }}></span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: Left column (Fleet & Sectors), Right column (Campaigns & Live terminal) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', gap: '2rem' }}>
        
        {/* Left Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          {/* Partner Fleet Management */}
          <div className="glass-panel">
            <h3>Partner Fleet Management</h3>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '1.25rem', fontSize: '0.85rem' }}>Track aircraft carriers, fleet inventory, and current operational states</p>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-glass)' }}>
                    <th style={{ padding: '0.75rem 0.5rem' }}>Airline Code</th>
                    <th style={{ padding: '0.75rem 0.5rem' }}>Carrier Name</th>
                    <th style={{ padding: '0.75rem 0.5rem' }}>Fleets</th>
                    <th style={{ padding: '0.75rem 0.5rem' }}>Status</th>
                    <th style={{ padding: '0.75rem 0.5rem' }}>Prune/Change</th>
                  </tr>
                </thead>
                <tbody>
                  {airlines.map(al => (
                    <tr key={al.code} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      <td style={{ padding: '0.75rem 0.5rem', fontFamily: 'monospace' }}>{al.code}</td>
                      <td style={{ padding: '0.75rem 0.5rem', fontWeight: '500' }}>{al.name}</td>
                      <td style={{ padding: '0.75rem 0.5rem' }}>{al.fleetSize} planes</td>
                      <td style={{ padding: '0.75rem 0.5rem' }}>
                        <span className={`airline-pill ${al.status.toLowerCase()}`}>{al.status}</span>
                      </td>
                      <td style={{ padding: '0.75rem 0.5rem' }}>
                        <select 
                          className="glass-input" 
                          style={{ padding: '0.2rem 0.4rem', fontSize: '0.75rem', width: 'auto' }}
                          value={al.status}
                          onChange={(e) => handleToggleAirlineStatus(al.code, e.target.value)}
                        >
                          <option value="ACTIVE">ACTIVE</option>
                          <option value="MAINTENANCE">MAINTENANCE</option>
                          <option value="GROUNDED">GROUNDED</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Global Sector Register */}
          <div className="glass-panel">
            <h3>Global Sector Register</h3>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '1.25rem', fontSize: '0.85rem' }}>Map active airports and destinations supported by AeroLink</p>
            
            <form onSubmit={handleAddSector} style={{ display: 'grid', gridTemplateColumns: '80px 1fr 1fr 90px', gap: '0.5rem', alignItems: 'end', marginBottom: '1.5rem' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label style={{ fontSize: '0.7rem' }}>IATA</label>
                <input className="glass-input" style={{ padding: '0.5rem' }} type="text" placeholder="DXB" value={newSectorCode} onChange={e => setNewSectorCode(e.target.value)} required />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label style={{ fontSize: '0.7rem' }}>City</label>
                <input className="glass-input" style={{ padding: '0.5rem' }} type="text" placeholder="Dubai" value={newSectorCity} onChange={e => setNewSectorCity(e.target.value)} required />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label style={{ fontSize: '0.7rem' }}>Country</label>
                <input className="glass-input" style={{ padding: '0.5rem' }} type="text" placeholder="U.A.E." value={newSectorCountry} onChange={e => setNewSectorCountry(e.target.value)} required />
              </div>
              <button className="glass-button" style={{ padding: '0.6rem 0.8rem', fontSize: '0.8rem' }} type="submit">Add</button>
            </form>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              {sectors.map(sec => (
                <div key={sec.code} className="hub-pill" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.4rem 0.6rem' }}>
                  <strong style={{ color: 'var(--accent-primary)' }}>{sec.code}</strong>
                  <span>{sec.city}, {sec.country}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          {/* Discount Campaign Manager */}
          <div className="glass-panel">
            <h3>Seasonal Discount Campaigns</h3>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '1.25rem', fontSize: '0.85rem' }}>Setup discount tariffs mapped to target flight sectors (reflected instantly in searches!)</p>

            <form onSubmit={handleAddCampaign} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr auto', gap: '0.5rem', alignItems: 'end', marginBottom: '1.5rem' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label style={{ fontSize: '0.7rem' }}>Campaign Name</label>
                <input className="glass-input" style={{ padding: '0.5rem' }} type="text" placeholder="Cherry Blossom Fest" value={newCampaignName} onChange={e => setNewCampaignName(e.target.value)} required />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label style={{ fontSize: '0.7rem' }}>Discount %</label>
                <input className="glass-input" style={{ padding: '0.5rem' }} type="number" min={5} max={80} value={newCampaignDiscount} onChange={e => setNewCampaignDiscount(e.target.value)} required />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label style={{ fontSize: '0.7rem' }}>Target IATA</label>
                <select className="glass-input" style={{ padding: '0.45rem' }} value={newCampaignTarget} onChange={e => setNewCampaignTarget(e.target.value)}>
                  {sectors.map(s => (
                    <option key={s.code} value={s.code}>{s.code}</option>
                  ))}
                </select>
              </div>
              <button className="glass-button" style={{ padding: '0.6rem 0.8rem', fontSize: '0.8rem' }} type="submit">Create</button>
            </form>

            <div className="campaign-grid">
              {campaigns.map(camp => (
                <div key={camp.id} className={`campaign-card ${camp.status === 'ACTIVE' ? 'active-campaign' : ''}`}>
                  <span className="campaign-badge">{camp.discount}% Off</span>
                  <h4>{camp.name}</h4>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '0.2rem 0' }}>Sector Destination: <strong style={{ color: 'var(--accent-secondary)' }}>{camp.target}</strong></p>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Status: {camp.status}</p>
                  
                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
                    <button 
                      className="glass-button secondary" 
                      style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem' }}
                      onClick={() => handleToggleCampaignStatus(camp.id)}
                    >
                      {camp.status === 'ACTIVE' ? 'Disable' : 'Enable'}
                    </button>
                    <button 
                      className="glass-button secondary" 
                      style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem', backgroundColor: 'rgba(239, 68, 68, 0.05)', color: 'var(--error)' }}
                      onClick={() => handleDeleteCampaign(camp.id)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Real-time Event Integrations Console Terminal */}
          <div className="terminal-panel">
            <div className="terminal-header">
              <div className="terminal-dots">
                <span className="term-dot red"></span>
                <span className="term-dot yellow"></span>
                <span className="term-dot green"></span>
              </div>
              <span className="terminal-title">INTEGRATIONS CONTROLLER STREAM</span>
              <span style={{ fontSize: '0.7rem', color: 'var(--success)', fontFamily: 'monospace' }}>● ONLINE</span>
            </div>
            
            <div className="terminal-console">
              {consoleLogs.map((log, index) => (
                <div key={index} className="terminal-log-line">
                  <span className="timestamp">[{log.time}]</span>
                  <span className={`tag ${log.tag}`}>{log.tag}</span>
                  <span className="message">{log.msg}</span>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
