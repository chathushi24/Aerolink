# AeroLink Airline Systems Platform: Verification & Testing Results

This report outlines the validation strategies, test scripts, and performance baselines of the **AeroLink Airline Systems Platform**.

---

## 1. Automated Unit Testing (Pytest)

The backend unit tests are written inside the `tests/unit/` directory using **Pytest**.
*   **Target Scope:** Validates cryptographic password hashing (bcrypt), access token expiration handling, payload decryptions, and JWT route security.
*   **To run the unit tests locally:**
    ```bash
    pytest tests/unit/
    ```

---

## 2. API Integration Testing (Postman)

A pre-configured Postman Collection is stored at `postman/aerolink-postman-collection.json`.
*   **Coverage:** Exercises the complete end-to-end operational flow:
    1.  Registers passenger `alex@aerolink.com`.
    2.  Authenticates user and saves JWT token as global environment variable `{{bearerToken}}`.
    3.  Queries flights matching specific routes.
    4.  Submits a passenger reservation (`POST /bookings`).
    5.  Completes dummy checkouts (`POST /payments`).
    6.  Tracks cargo bags and re-routes barcode locations.

---

## 3. Load & Performance Testing (k6)

Stress testing is governed by **k6** using the script `tests/performance/k6-booking-test.js`.

### Test Architecture
*   **Virtual Users (VUs):** Ramps up from 0 to 20 users over 30 seconds, holds stress at 20 users for 60 seconds, and ramps down over 30 seconds.
*   **Threshold Gates:**
    *   `http_req_duration`: 95% of requests must complete under 500ms (`p(95)<500`).
    *   `http_req_failed`: Error rate must be less than 1% (`rate<0.01`).

### Performance Metrics to Track
1.  **Latency (Response Time):** Time from client sending request to receiving complete payload. 95th percentile (p95) indicates slowest client experiences.
2.  **Throughput (RPS):** Total Requests Per Second processed by the cluster.
3.  **Error Rate:** Count of 5xx server exceptions or network timeout drops.

---

## 4. Expected Bottlenecks and Architectural Resolutions

| Performance Bottleneck | Root Cause Analysis | Architectural Resolution |
| :--- | :--- | :--- |
| **CPU Spikes on Auth-Service** | Bcrypt hashing algorithm is resource-intensive by design to prevent brute force cracking. Under high registration load, CPU utilization hits 100%. | Set Horizontal Pod Autoscaler (HPA) to scale containers when CPU exceeds 70%, and optimize bcrypt rounds. |
| **DynamoDB Throughput Limits** | High frequency concurrent updates to `FlightsTable` seat counts or `BookingsTable` inserts exhaust standard write capacity limits. | Enable **DynamoDB Pay-Per-Request (On-Demand)** pricing which automatically scales database capacity instantly. |
| **SQS Event Polling Overhead** | Background worker threads checking SQS queues continuously execute network GET calls, causing API lag or high bills. | Use **SQS Long Polling** (`WaitTimeSeconds = 10` or `20`) which keeps SQS connection open until a message arrives, reducing empty reads to zero. |
