# AeroLink Airline Systems Platform: React Frontend

This is the high-performance, single-page client application for **AeroLink Airline Systems**, built using React.js and vanilla glassmorphism styling.

## Features
*   **Decoupled Multi-service Ingress:** Targets the six dedicated microservice APIs dynamically.
*   **Role-Based Security:** Protects routes and dashboard views for `PASSENGER`, `STAFF`, and `ADMIN`.
*   **Stripe Card Gateway Simulator:** PCI-DSS compliant checkout tokenization test mode.
*   **Cargo Transit Tracker:** Interactive, visual progress nodes representing baggage statuses.
*   **Real-time Event Notifications Panel:** Captures system execution histories logged via Amazon EventBridge SQS.

## Getting Started Locally

1.  **Install dependencies:**
    ```bash
    npm install
    ```

2.  **Run the local development server:**
    ```bash
    npm start
    ```
    This launches the site at [http://localhost:3000](http://localhost:3000).

## Environment Variables
The application reads endpoints from environment variables:
*   `REACT_APP_AUTH_SERVICE_URL` (Default: `http://localhost:8001`)
*   `REACT_APP_FLIGHT_SERVICE_URL` (Default: `http://localhost:8002`)
*   `REACT_APP_BOOKING_SERVICE_URL` (Default: `http://localhost:8003`)
*   `REACT_APP_PAYMENT_SERVICE_URL` (Default: `http://localhost:8004`)
*   `REACT_APP_BAGGAGE_SERVICE_URL` (Default: `http://localhost:8005`)
*   `REACT_APP_NOTIFICATION_SERVICE_URL` (Default: `http://localhost:8006`)
