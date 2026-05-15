# QuizGenius 🧠
**Full-Stack AI-Powered Quiz Platform with Cloud & Infrastructure as Code (IaC)**

QuizGenius is a modern web application that leverages Generative AI to automatically transform uploaded lecture notes (PDF/TXT) into rigorous, Master's-level academic quizzes. Built with React and FastAPI, the entire application is containerized with Docker and deployed to AWS using Terraform for a fully automated, scalable infrastructure.

---

## 📸 Platform Previews

### Dashboard & Quiz History
![Dashboard Preview](docs/dashboard.webp)

### Master's Level Quiz Evaluation
![Quiz Results](docs/results.webp)

---

## 🏗️ Cloud Architecture

This project maps directly to modern cloud concepts, fulfilling the following AWS requirements:
- **Compute (Amazon EC2):** Hosts the Dockerized frontend (Nginx) and backend (FastAPI).
- **Storage (Amazon S3):** Securely stores uploaded user documents (PDF/TXT).
- **Networking (Amazon VPC):** Custom Virtual Private Cloud, Subnets, Internet Gateway, and Security Groups isolating traffic.
- **Database (Amazon DynamoDB):** NoSQL persistence for user authentication, API responses, and historical quiz scores.
- **Infrastructure as Code (Terraform):** Fully automated deployment of all AWS resources.

---

## 🚀 Features
- **AI-Powered Generation:** Upload any PDF/TXT and the Groq AI engine generates questions tiered into Easy (Foundational), Medium (Applied Concept), and Hard (Analytical).
- **Exam Mode:** Answer questions sequentially, track unattempted questions, and review detailed explanations for correct/incorrect answers.
- **Persistent History:** All past quizzes are saved to DynamoDB and can be reviewed from the Dashboard at any time.
- **Secure Authentication:** JWT-based user login and signup flow.

---

## 📂 Project Structure

```text
QuizGenius/
├── backend/            # FastAPI Python application
│   ├── main.py         # Core API logic and Groq/AWS integrations
│   ├── Dockerfile      # Python 3.11 build instructions
│   └── requirements.txt
├── frontend/           # React + Vite frontend
│   ├── src/            # Components, pages, and UI logic
│   ├── Dockerfile      # Multi-stage Node.js build -> Nginx server
│   └── nginx.conf      # Serves React SPA and proxies /api/ logic
├── terraform/          # Infrastructure as Code
│   └── main.tf         # Defines VPC, S3, DynamoDB, EC2, and user_data boot script
├── docker-compose.yml  # Local orchestration
└── README.md
```

---

## ⚙️ How to Run Locally

If you wish to test the application locally on your machine using Docker Desktop:

### 1. Configure the Environment
Create a `.env` file inside the `backend/` directory based on this exact structure:

```env
# backend/.env

# AWS Credentials (Required for S3 and DynamoDB)
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_SESSION_TOKEN=your_session_token  # If using temporary Lab credentials
AWS_REGION=us-east-1

# S3 Storage Configuration
S3_BUCKET=your_s3_bucket_name

# Authentication (Can be any random secure string)
JWT_SECRET=your_super_secret_jwt_string

# AI Engine
GROQ_API_KEY=gsk_your_groq_api_key_here
```

### 2. Start Docker Compose
From the root directory of the project, run:
```bash
docker-compose up -d --build
```

### 3. Access the Application
- **Website:** `http://localhost`
- **Backend API:** `http://localhost:3001` (Nginx proxies `http://localhost/api/...` directly to the backend).

---

## 🌩️ How to Deploy to AWS

Because this project uses **Terraform**, deploying the entire stack takes less than 5 minutes.

1. Ensure your AWS CLI is configured with active credentials.
2. Navigate to the Terraform directory: `cd terraform`
3. Edit the `terraform.tfvars` file to include your GitHub URL and API keys.
4. Run:
   ```bash
   terraform init
   terraform apply -auto-approve
   ```
5. Wait 3 minutes for the EC2 internal boot script (`user_data`) to finish installing Docker and cloning the repository.
6. Visit the printed **EC2 Public IP** address in your browser!

---


