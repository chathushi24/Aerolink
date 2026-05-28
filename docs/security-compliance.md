# AeroLink Airline Systems Platform: Security & Compliance Report

This document presents the design decisions, patterns, and mechanisms used to secure the **AeroLink Platform** both in transit and at rest.

---

## 1. Authentication and Access Control (OAuth2 / JWT / RBAC)

AeroLink implements a robust **Role-Based Access Control (RBAC)** architecture governed by JSON Web Tokens (JWT) and backed by Amazon Cognito in the cloud:
1.  **Identity Registry (Amazon Cognito):** Manages user directory storage. Users are assigned to Cognito groups (`PASSENGER`, `STAFF`, `ADMIN`) which serve as the security perimeter.
2.  **Access Token Scopes (FastAPI Router Guards):** Access tokens encode the user's role:
    *   **PASSENGER:** Read flight list, book flights (for their own user ID), check their own baggage and notification histories.
    *   **STAFF / ADMIN:** Global read/write operations. Can add/modify flight itineraries, adjust pricing models, update active flight schedules, and scan/re-route cargo baggage coordinates.
3.  **Local Dev JWT Validation:** Microservices share a common HS256 secret signing key (`JWT_SECRET`) which allows stateless token validation within Docker containers.

---

## 2. Regulatory Compliance Frameworks

### PCI-DSS Compliance (Payment Card Security)
*   **Tokenization Strategy:** The `payment-service` never gathers, receives, or stores plain-text credit card numbers, expiry dates, or CVV codes. 
*   **Gateway Separation:** The React client tokenizes credentials using secure front-end components (Stripe test mode integrations), passing only a generic gateway token (`tok_visa`) to our backend.
*   **Decoupled Billing Logs:** The `PaymentsTable` only logs transaction metadata (payment ID, booking reference, amount, reference reference).

### GDPR Compliance (Privacy & Data Protection)
*   **Data Minimisation:** The `UsersTable` only retains essential fields (name, email, bcrypt password hash, role). No sensitive personal records are processed.
*   **Consent & Isolation:** SQS queues handle messages securely, and passengers cannot access booking or notification logs that do not belong to their specific identity registry sub-claim.
*   **User Deletion Concept:** The microservice architecture includes provisions to scrub user tables, deleting associated bookings and luggage IDs to satisfy the "Right to be Forgotten" standard.

---

## 3. Infrastructure Security (AWS IAM & KMS)

*   **Encryption-at-Rest:** All Amazon DynamoDB tables are encrypted using an **AWS KMS Customer Managed Key (CMK)** with automatic key rotation enabled.
*   **Secrets Management:** Sensitive variables such as token signing secrets and gateway payment credentials are stored inside **AWS Secrets Manager**, keeping them secure from plain-text code logs.
*   **IAM Least Privilege:** Serverless Lambda roles and EKS worker node groups are restricted to narrow IAM policies (e.g., Lambda can only read from the `NotificationLogsQueue` and write to the `NotificationsTable`).
