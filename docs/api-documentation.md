# AeroLink Platform: API Documentation

This document outlines the distributed REST APIs of the **AeroLink Airline Systems Platform**. Every microservice generates interactive Swagger/OpenAPI documentation natively at `/docs` or `/redoc` when running.

---

## 1. auth-service (Port 8001)

### `POST /auth/register`
*   **Description:** Register a new passenger, staff, or admin user.
*   **Request Body (JSON):**
    ```json
    {
      "name": "Sarah Staff",
      "email": "staff@aerolink.com",
      "password": "staffpassword123",
      "role": "STAFF"
    }
    ```
*   **Response (201 Created):**
    ```json
    {
      "user_id": "usr-staff-201",
      "name": "Sarah Staff",
      "email": "staff@aerolink.com",
      "role": "STAFF",
      "created_at": "2026-05-28T20:45:00Z"
    }
    ```

### `POST /auth/login`
*   **Description:** Authenticate user and issue signed Bearer JWT token with embedded role scopes.
*   **Request Body (JSON):**
    ```json
    {
      "email": "staff@aerolink.com",
      "password": "staffpassword123"
    }
    ```
*   **Response (200 OK):**
    ```json
    {
      "access_token": "eyJhbGciOiJIUzI1NiIsIn...",
      "token_type": "bearer",
      "role": "STAFF"
    }
    ```

---

## 2. flight-service (Port 8002)

### `GET /flights`
*   **Description:** Search and retrieve flights by origin, destination, or date.
*   **Query Parameters:** `origin` (e.g. JFK), `destination` (e.g. LHR), `date` (Format: YYYY-MM-DD).
*   **Response (200 OK):**
    ```json
    [
      {
        "flight_id": "fl-nyc-lon-101",
        "flight_number": "AL101",
        "origin": "JFK",
        "destination": "LHR",
        "departure_time": "2026-06-01T08:00:00Z",
        "arrival_time": "2026-06-01T20:00:00Z",
        "price": 550.0,
        "total_seats": 150,
        "available_seats": 142,
        "status": "SCHEDULED"
      }
    ]
    ```

### `POST /flights` (Requires STAFF or ADMIN role)
*   **Description:** Schedule a new flight sector on the route network.
*   **Authorization:** `Bearer <JWT_TOKEN>`

---

## 3. booking-service (Port 8003)

### `POST /bookings` (Requires Authentication)
*   **Description:** Reserves seats, creates PENDING transaction, publishes `BookingCreated` to EventBridge.
*   **Request Body (JSON):**
    ```json
    {
      "passenger_id": "usr-passenger-101",
      "flight_id": "fl-nyc-lon-101",
      "seat_count": 2
    }
    ```
*   **Response (201 Created):**
    ```json
    {
      "booking_id": "bk-88219-c09a",
      "passenger_id": "usr-passenger-101",
      "flight_id": "fl-nyc-lon-101",
      "seat_count": 2,
      "booking_status": "PENDING",
      "payment_status": "UNPAID",
      "created_at": "2026-05-28T20:45:10Z"
    }
    ```

---

## 4. payment-service (Port 8004)

### `POST /payments` (Requires Authentication)
*   **Description:** Secure card gateway processing. Card tokens are captured; card details are never stored (PCI-DSS compliant).
*   **Request Body (JSON):**
    ```json
    {
      "booking_id": "bk-88219-c09a",
      "amount": 1100.0,
      "payment_method": "VISA_CARD",
      "card_token": "tok_visa"
    }
    ```

---

## 5. baggage-service (Port 8005)

### `GET /baggage/{booking_id}` (Requires Authentication)
*   **Description:** Fetch cargo routing tracks for passengers or ground handlers.

### `PATCH /baggage/{baggage_id}/status` (Requires STAFF or ADMIN role)
*   **Description:** ground teams re-route baggage (CHECKED_IN, SORTING, IN_TRANSIT, ARRIVED, CLAIMED).

---

## 6. notification-service (Port 8006)

### `GET /notifications/{user_id}` (Requires Authentication)
*   **Description:** Retrieve push and log notifications triggered via EventBridge rule routing.
