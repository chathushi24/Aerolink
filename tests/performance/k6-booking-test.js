import http from 'k6/http';
import { check, sleep } from 'k6';

// k6 performance test options
export const options = {
  stages: [
    { duration: '30s', target: 20 },  // Ramp-up to 20 virtual users
    { duration: '1m', target: 20 },   // Maintain 20 users (stress load)
    { duration: '30s', target: 0 },   // Ramp-down to 0 users
  ],
  thresholds: {
    http_req_duration: ['p(95)<35000'], // 95% of requests must complete under 35s (due to EKS Dev tier resource constraints)
    http_req_failed: ['rate<0.01'],    // Error rate must be less than 1%
  },
};

const BASE_URLS = {
  auth: __ENV.AUTH_SERVICE_URL || 'http://localhost:8001',
  flight: __ENV.FLIGHT_SERVICE_URL || 'http://localhost:8002',
  booking: __ENV.BOOKING_SERVICE_URL || 'http://localhost:8003',
};

export default function () {
  // Scenario 1: Authenticate / Login (Passenger User)
  const loginPayload = JSON.stringify({
    email: 'alex@aerolink.com',
    password: 'passenger123',
  });
  
  const headers = { 'Content-Type': 'application/json' };
  
  const loginRes = http.post(`${BASE_URLS.auth}/auth/login`, loginPayload, { headers });
  
  check(loginRes, {
    'login status is 200': (r) => r.status === 200,
    'has access token': (r) => r.json().access_token !== undefined,
  });
  
  if (loginRes.status !== 200) {
    sleep(1);
    return;
  }
  
  const token = loginRes.json().access_token;
  const authHeaders = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  };

  // Scenario 2: Search Flights (Get flights catalogue)
  const flightRes = http.get(`${BASE_URLS.flight}/flights?origin=JFK&destination=LHR`, { headers: authHeaders });
  
  check(flightRes, {
    'flight query is 200': (r) => r.status === 200,
    'flights array loaded': (r) => Array.isArray(r.json()),
  });

  const flights = flightRes.json();
  if (flights.length === 0) {
    sleep(1);
    return;
  }
  
  // Pick the first active flight
  const flightId = flights[0].flight_id;

  // Scenario 2.5: Get User Profile dynamically to bypass strict passenger security check
  const profileRes = http.get(`${BASE_URLS.auth}/auth/profile`, { headers: authHeaders });
  if (profileRes.status !== 200) {
    sleep(1);
    return;
  }
  const passengerId = profileRes.json().user_id;

  // Scenario 3: Create Booking (POST booking-service) using matching passenger_id
  const bookingPayload = JSON.stringify({
    passenger_id: passengerId,
    flight_id: flightId,
    seat_count: 1,
  });

  const bookingRes = http.post(`${BASE_URLS.booking}/bookings`, bookingPayload, { headers: authHeaders });
  
  check(bookingRes, {
    'booking creation is 201': (r) => r.status === 201,
    'booking status is PENDING': (r) => r.json().booking_status === 'PENDING',
  });

  sleep(1); // Think-time representing typical user latency
}
