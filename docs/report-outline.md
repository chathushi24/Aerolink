# AeroLink Airline Platform: Academic Report Outline & Presentation Guide

This report outlines the academic structure of the final assignment submission, compiles presentation slides, lists potential viva exam questions, and provides an evidence screenshot checklist.

---

## 1. Academic Report Outline (Assignment Mapping)

### Section 1: Introduction and Design Strategy
*   **Context:** AeroLink's monolithic legacy bottleneck analysis.
*   **Solution:** Transitioning to a distributed, event-driven, cloud-native microservices architecture.
*   **Key Services:** Mapping out the 6 FastAPI services and their responsibilities.

### Section 2: Cloud-Native Architecture & Infras as Code (Criteria 1)
*   **Physical Topology:** VPC, Multi-AZ subnets, NAT Gateways, EKS node configuration.
*   **Declarative Code:** Deep dive into the structured Terraform environment setup (`dev/main.tf` and modules).

### Section 3: REST API Design & Microservice Separation (Criteria 2)
*   **Swagger API Docs:** Explanation of how FastAPI automates OpenAPI spec generation.
*   **Unified Client:** Axios routing in the React client, loading JWT authorization Bearer tokens.

### Section 4: Security, Auditing & PCI-DSS/GDPR (Criteria 3)
*   **Access Control:** JWT + Cognito groups, FastAPI RBAC path guards.
*   **PCI-DSS:** Stripe tokenization dummy checkout, avoiding raw credit card retention.
*   **GDPR:** Least privilege IAM, KMS Customer Managed Key table level encryption.

### Section 5: Event-Driven Real-Time State Sync (Criteria 4)
*   **Event Backbone:** EventBridge Custom bus, rules, and SQS Queue fan-out.
*   **Decoupled Sync:** Explaining how `flight-service` seat decrements, `payment-service` checkouts, and `notification-service` logging trigger asynchronously from the SQS queues.

### Section 6: High Availability & Fault Isolation (Criteria 5)
*   **Autoscaling:** Horizontal Pod Autoscaler (HPA) triggers in EKS cluster.
*   **Resilience:** SQS Dead-Letter Queues (DLQs) catching transaction faults. EKS pod auto-healing.

### Section 7: Stress Testing and Performance Results (Criteria 6)
*   **k6 Test Runs:** Scenarios, Virtual User stress, throughput logs, response latency thresholds.
*   **Bottlenecks:** Discussing CPU exhaustion from bcrypt password hashing, SQS polling, and resolution steps.

### Section 8: Observability, Metrics & Health Probes (Criteria 7 & 8)
*   **Heartbeat endpoints:** `/health` custom endpoint check in each microservice.
*   **Central Logs:** CloudWatch logs capturing container logs and EventBridge transaction flows.

---

## 2. 15-Minute Academic Presentation Slide Structure

*   **Slide 1: Title Slide** — AeroLink Airline Systems Platform: A Cloud-Native Microservices Transition.
*   **Slide 2: Problem Statement** — Monolithic legacy failure points, scaling limits, single points of failure.
*   **Slide 3: Architecture Blueprint** — Explaining the VPC layout, EKS containers, and DynamoDB storage. (Embed the Mermaid diagram here).
*   **Slide 4: Microservices APIs** — Overview of the 6 FastAPI services and Swagger interactive portals.
*   **Slide 5: Identity & Security** — Amazon Cognito, RBAC group separations, JWT credentials.
*   **Slide 6: Event-Driven Backbone** — EventBridge + SQS decoupling, step-by-step transaction flow sequence.
*   **Slide 7: IaC via Terraform** — Reviewing modules: VPC, DynamoDB, Cognito, SQS, and Lambda.
*   **Slide 8: Fault Isolation & Scalability** — HPAs, Multi-AZ deployments, Dead-Letter Queues (DLQs).
*   **Slide 9: Load & Stress Testing** — k6 performance testing charts, latency times, bottlenecks.
*   **Slide 10: Conclusion & References** — Key takeaways, student contributions, research bibliography.

---

## 3. Viva Exam Mock Questions & Technical Answers

### Q1: Why did you choose EventBridge over synchronous REST calls for booking payment?
> **Answer:** Synchronous HTTP calls couple services together. If the `payment-service` goes offline or gets overloaded during peak sales, the `booking-service` fails immediately. By using EventBridge and SQS queues as buffers, we achieve strict **Fault Isolation**. The booking is saved as `PENDING` instantly. Even if `payment-service` drops, the transaction is safely queued in SQS, processed when online, and resolved asynchronously without passenger disruption.

### Q2: How does your database schema support high-velocity flight search query volumes?
> **Answer:** We use Amazon DynamoDB. Instead of scanning the entire database which is expensive and slow, we set a **Global Secondary Index (GSI)** named `RouteIndex` (Partition: `origin`, Range: `destination`) on the `FlightsTable`. This allows near-instant queries matching flight sectors (JFK to LHR) in under 10 milliseconds, regardless of table size, preventing database bottlenecks.

### Q3: How is your system PCI-DSS compliant?
> **Answer:** PCI-DSS prohibits storing plaintext credit card numbers or security codes. AeroLink satisfies this by utilizing front-end tokenization. The passenger inserts credentials on a secure client checkout page which resolves to a secure gateway token. Only this token (`tok_visa`) is sent to our API backend. Card numbers never touch our servers or DynamoDB, satisfying the highest compliance criteria.

### Q4: How does Kubernetes recover when a microservice pod crashes?
> **Answer:** We configured **Liveness and Readiness Probes** targeting `/health` in each FastAPI service. If a pod locks up or fails internal memory loops, the liveness probe fails. The EKS kube-scheduler identifies the failure, kills the damaged pod, and boots a new container automatically, maintaining continuous uptime.

---

## 4. Evidence Screenshot Checklist for Final Report

To get maximum marks, compile and insert screenshots of the following actions during deployment:

1.  **Terraform Provisioning logs:**
    *   `terraform init` success logs.
    *   `terraform plan` resource counts.
    *   `terraform apply` complete success log showing AWS resource IDs.
2.  **AWS Console Verification:**
    *   VPC Console showing private subnets in us-east-1a and us-east-1b.
    *   DynamoDB Console showing the 6 custom tables populated.
    *   Cognito Console showing the `PASSENGER`, `STAFF`, and `ADMIN` groups.
    *   SQS Console showing the 5 active queues and the Dead Letter Queue.
    *   Amazon EKS Console showing EKS node group instances.
3.  **Local Application Validation:**
    *   FastAPI Swagger UI screenshot visiting `http://localhost:8001/docs`.
    *   React UI Dashboard screenshot displaying flight catalog and cargo progress nodes.
    *   `pytest` console log execution showing all unit test cases passing.
    *   `k6 run` load test terminal log showing latency percentile reports.
