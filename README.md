# AeroLink Airline Systems Platform ✈

AeroLink is a modern, cloud-native, distributed aviation technology platform designed from start to finish as a secure, high-availability, globally scalable, and fault-tolerant university assignment platform.

This project transitions a monolithic legacy system into a completely decoupled microservices architecture deployed **100% in AWS** using **FastAPI**, **React.js**, **Docker**, **Kubernetes (Amazon EKS)**, **Amazon EventBridge**, **SQS**, **AWS Lambda**, and **Amazon DynamoDB**, fully provisioned via **Terraform**.

---

## 🛠 Pure AWS Tech Stack Overview

*   **Frontend:** React.js, modern glassmorphic vanilla CSS, compiled to static assets and served globally via **Amazon S3** and **Amazon CloudFront** Edge networks.
*   **Backend:** 6 containerized Python FastAPI microservices running inside **Amazon EKS (Elastic Kubernetes Service)** pods with Horizontal Pod Autoscaling (HPA) policies.
*   **Database:** Amazon DynamoDB (NoSQL tables with point-in-time recovery, KMS keys, and GSIs) managed entirely through Terraform modules.
*   **Container Security:** Amazon ECR registries. Containers authenticate natively using **IAM Roles for Service Accounts (IRSA)**.
*   **Edge Ingress / Auth:** AWS ALB Ingress, Amazon API Gateway, Amazon Cognito User Pools and User Groups (`PASSENGER`, `STAFF`, `ADMIN`).
*   **Event-Driven Core:** Amazon EventBridge Custom Event Bus, Amazon SQS Queues, SQS Dead-Letter Queues (DLQ), and AWS Lambda notification log processors.
*   **IaC (Infrastructure as Code):** Declarative, modular Terraform files (`environments/dev/` and `modules/`).
*   **Verification:** Pytest unit tests, Postman API collections, and k6 load/stress testing scripts.

---

## 📂 Project Structure

```
aerolink-platform/
│
├── frontend/                     # React.js application
│   ├── src/                      # Source components, contexts, hooks, and routing
│   ├── package.json
│   ├── Dockerfile
│   └── README.md
│
├── services/                     # 6 FastAPI Microservices
│   ├── auth-service/
│   ├── flight-service/
│   ├── booking-service/
│   ├── payment-service/
│   ├── baggage-service/
│   └── notification-service/
│
├── infrastructure/
│   ├── kubernetes/               # K8s manifest templates for EKS pods, services, ingress
│   ├── argocd/                   # ArgoCD GitOps declaration
│   ├── github-actions/           # GitHub Actions workflows
│   ├── aws/                      # Lambda serverless trigger scripts
│   └── terraform/                # Infrastructure as Code
│       ├── environments/         # dev/ and prod/ variable overrides
│       └── modules/              # Reusable modules (VPC, DynamoDB, etc.)
│
├── postman/                      # Complete API Testing Collections
├── tests/                        # Unit, Integration, and Performance scripts
├── docs/                         # Technical Architecture & Compliance Documents
└── README.md                     # Central developer onboarding manual
```

---

## 🚀 Quick Deployment Guide

Detailed execution instructions are provided in the [docs/](file:///c:/Users/user/Desktop/Aerolink/docs/) folder:
1.  **Technical Architecture (inc. swimlanes & flows):** [architecture.md](file:///c:/Users/user/Desktop/Aerolink/docs/architecture.md)
2.  **REST API Parameters & OpenAPI Specifications:** [api-documentation.md](file:///c:/Users/user/Desktop/Aerolink/docs/api-documentation.md)
3.  **GDPR, PCI-DSS, AWS IAM, & KMS Audits:** [security-compliance.md](file:///c:/Users/user/Desktop/Aerolink/docs/security-compliance.md)
4.  **Pytest, Postman, & k6 Stress Testing Results:** [testing-results.md](file:///c:/Users/user/Desktop/Aerolink/docs/testing-results.md)
5.  **Docker, ECR, EKS Node Group, & Argo CD DevOps Runbook:** [deployment-guide.md](file:///c:/Users/user/Desktop/Aerolink/docs/deployment-guide.md)
6.  **Academic Report Outlines, Slide Decks, & Viva Q&As:** [report-outline.md](file:///c:/Users/user/Desktop/Aerolink/docs/report-outline.md)

### Step 1: Provision Infrastructure
```powershell
cd infrastructure/terraform/environments/dev/
terraform init
terraform apply -auto-approve
```

### Step 2: Push Images to Amazon ECR
```powershell
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin <AWS_ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com
# Execute tag & push sequence for your services
```

### Step 3: Launch Kubernetes App
```powershell
aws eks update-kubeconfig --region us-east-1 --name dev-aerolink-eks
kubectl apply -f infrastructure/kubernetes/
```
Your platform is now fully deployed and active in AWS. Visit the CloudFront domain output from your Terraform scripts to check the live React app!
