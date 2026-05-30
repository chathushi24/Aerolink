// Detect if running on localhost for local development fallback
export const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

// API BASE URL Config (Dynamic pathing for AWS ALB Ingress routing)
export const API_URLS = {
  auth: isLocalhost ? 'http://localhost:8001' : '',
  flight: isLocalhost ? 'http://localhost:8002' : '',
  booking: isLocalhost ? 'http://localhost:8003' : '',
  payment: isLocalhost ? 'http://localhost:8004' : '',
  baggage: isLocalhost ? 'http://localhost:8005' : '',
  notification: isLocalhost ? 'http://localhost:8006' : '',
};
