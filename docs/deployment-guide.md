# AeroLink Airline Systems Platform: Pure AWS DevOps Runbook

This guide presents complete command instructions to provision cloud infrastructure and deploy the **AeroLink Airline Systems Platform** natively on **Amazon EKS**.

---

## 1. Cloud Infrastructure Provisioning (Terraform)

AWS resources are managed declaratively using structured, modular Terraform configurations.

### Step 1: Initialize Terraform
Navigate to the dev environment directory:
```powershell
cd infrastructure/terraform/environments/dev/
terraform init
```

### Step 2: Format & Validate Manifests
Ensure declarative syntax is clean and compliant:
```powershell
terraform fmt -recursive
terraform validate
```

### Step 3: Review Infrastructure Plan
Preview the resources Terraform plans to provision in your AWS account:
```powershell
terraform plan
```

### Step 4: Deploy to AWS
Apply the configurations. **Warning: This provisions active, secure AWS resources.**
```powershell
terraform apply -auto-approve
```
Upon completion, copy the outputs (EKS Cluster name, API Gateway Endpoint, CloudFront CDN address, and Cognito IDs).

---

## 2. Container Compilation and Push (Amazon ECR)

Since local orchestration is obsolete, images are built directly for ECR registries:

1.  **Retrieve ECR Authenticate Token:**
    ```bash
    aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin <AWS_ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com
    ```
2.  **Tag and Push your Docker Images:**
    Build and register each microservice and the React frontend container:
    ```bash
    # Build Auth Service
    docker build -t dev-aerolink-auth-service ./services/auth-service
    docker tag dev-aerolink-auth-service:latest <AWS_ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com/dev-aerolink-auth-service:latest
    docker push <AWS_ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com/dev-aerolink-auth-service:latest
    ```
    Repeat this build, tag, and push sequence for all remaining services:
    *   `dev-aerolink-flight-service`
    *   `dev-aerolink-booking-service`
    *   `dev-aerolink-payment-service`
    *   `dev-aerolink-baggage-service`
    *   `dev-aerolink-notification-service`
    *   `dev-aerolink-frontend`

---

## 3. Kubernetes Cluster Orchestration (Amazon EKS)

1.  **Connect Local `kubectl` to EKS Cluster:**
    ```bash
    aws eks update-kubeconfig --region us-east-1 --name dev-aerolink-eks
    ```
2.  **Apply Deployment Manifests:**
    Provision namespaces, deployments, pods, service IP layers, and ingress rules:
    ```bash
    kubectl create namespace aerolink
    kubectl apply -f infrastructure/kubernetes/
    ```
3.  **Inspect Live Container Statuses:**
    Ensure liveness/readiness probes are returning healthy `status` logs:
    ```bash
    kubectl get pods -n aerolink -o wide
    kubectl get ingress -n aerolink
    ```

---

## 4. GitOps Automated Deployments (Argo CD)

1.  **Deploy Argo CD Core Services:**
    ```bash
    kubectl create namespace argocd
    kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml
    ```
2.  **Deploy GitOps Application Manifest:**
    ```bash
    kubectl apply -f infrastructure/argocd/aerolink-application.yaml
    ```
    Argo CD will automatically sync Git commits from your repository's `/infrastructure/kubernetes` directory directly to EKS pods in real-time, executing continuous delivery.
