import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../../context/AuthContext';
import { API_URLS } from '../../config';

export default function FlightCatalog() {
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
                  <p>{new Date(fl.departure_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' })}</p>
                </div>
                <div className="route-connector">
                  <span className="plane-icon">✈</span>
                  <div className="connector-line"></div>
                </div>
                <div className="route-point">
                  <h3>{fl.destination}</h3>
                  <p>{new Date(fl.arrival_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' })}</p>
                </div>
              </div>
              <div className="flight-details-row">
                <div>
                  <span className="label">Date</span>
                  <p style={{ fontSize: '0.9rem' }}>{new Date(fl.departure_time).toLocaleDateString([], { timeZone: 'UTC' })}</p>
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
            <div className="destination-img" style={{ backgroundImage: 'url(/london_destination.png)' }}></div>
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
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Departure: {new Date(selectedFlight.departure_time).toLocaleString([], { timeZone: 'UTC' })}</p>
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
