# Terraform Configuration & Providers
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.0"
    }
  }
}

# AWS Provider Configuration
provider "aws" {
  region = "us-east-1"
}

# Fetch existing IAM Instance Profile for EC2 permissions
data "aws_iam_instance_profile" "lab_profile" {
  name = "LabInstanceProfile"
}

# Variables for deployment configuration
variable "github_repo_url" {
  description = "HTTPS URL of the GitHub repository"
  type        = string
}

variable "groq_api_key" {
  description = "Groq API Key for AI quiz generation"
  type        = string
  sensitive   = true
}

variable "jwt_secret" {
  description = "Secret key for JWT token signing"
  type        = string
  default     = "quizgenius-production-secret-key-2026"
}

# VPC Network Setup
resource "aws_vpc" "main" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_support   = true
  enable_dns_hostnames = true

  tags = {
    Name = "QuizGenius-VPC"
  }
}

# Public Subnet (where EC2 will live)
resource "aws_subnet" "public" {
  vpc_id                  = aws_vpc.main.id
  cidr_block              = "10.0.1.0/24"
  availability_zone       = "us-east-1a"
  map_public_ip_on_launch = true

  tags = {
    Name = "QuizGenius-Public-Subnet"
  }
}

# Internet Gateway (Enables internet access for VPC)
resource "aws_internet_gateway" "igw" {
  vpc_id = aws_vpc.main.id

  tags = {
    Name = "QuizGenius-IGW"
  }
}

# Public Route Table & Association
resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.igw.id
  }

  tags = {
    Name = "QuizGenius-Public-RT"
  }
}

resource "aws_route_table_association" "public" {
  subnet_id      = aws_subnet.public.id
  route_table_id = aws_route_table.public.id
}

# Security Group (Firewall rules for EC2)
resource "aws_security_group" "web_sg" {
  name        = "QuizGenius-SG"
  description = "Allow SSH, HTTP, and HTTPS inbound"
  vpc_id      = aws_vpc.main.id

  ingress {
    description = "SSH"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "HTTP"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "HTTPS"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "Backend API"
    from_port   = 3001
    to_port     = 3001
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "QuizGenius-SG"
  }
}

# EC2 Instance: QuizGenius Web Server
resource "aws_instance" "web_server" {
  ami                    = "ami-02777684819ca2214"
  instance_type          = "t2.micro"
  iam_instance_profile   = data.aws_iam_instance_profile.lab_profile.name
  key_name               = "vockey"
  subnet_id              = aws_subnet.public.id
  vpc_security_group_ids = [aws_security_group.web_sg.id]

  # Auto-setup script: installs Docker, clones repo, starts containers
  user_data = <<-EOF
    #!/bin/bash
    set -e

    # 1. Install Docker
    yum update -y
    yum install -y docker git
    systemctl start docker
    systemctl enable docker
    usermod -aG docker ec2-user

    # 2. Install Docker Compose
    DOCKER_COMPOSE_VERSION="v2.29.1"
    curl -SL "https://github.com/docker/compose/releases/download/$${DOCKER_COMPOSE_VERSION}/docker-compose-linux-x86_64" \
      -o /usr/local/bin/docker-compose
    chmod +x /usr/local/bin/docker-compose

    # 3. Clone the repository
    cd /home/ec2-user
    git clone ${var.github_repo_url} app
    cd app

    # 4. Create backend .env file with production values
    cat > backend/.env <<ENVFILE
    AWS_REGION=us-east-1
    S3_BUCKET=${aws_s3_bucket.documents.id}
    GROQ_API_KEY=${var.groq_api_key}
    JWT_SECRET=${var.jwt_secret}
    FRONTEND_URL=http://$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4)
    ENVFILE

    # 5. Build and start both containers
    /usr/local/bin/docker-compose up -d --build

    # 6. Log completion
    echo "QuizGenius deployment complete at $(date)" >> /var/log/quizgenius-deploy.log
  EOF

  tags = {
    Name = "QuizGenius"
  }
}

# DynamoDB VPC Endpoint (Optimizes traffic within AWS network)
resource "aws_vpc_endpoint" "dynamodb" {
  vpc_id       = aws_vpc.main.id
  service_name = "com.amazonaws.us-east-1.dynamodb"

  route_table_ids = [aws_route_table.public.id]

  tags = {
    Name = "QuizGenius-DynamoDB-Endpoint"
  }
}

# DynamoDB Table: User Authentication (Logins)
resource "aws_dynamodb_table" "users" {
  name           = "QuizGeniusUsers"
  billing_mode   = "PROVISIONED"
  read_capacity  = 5
  write_capacity = 5
  hash_key       = "email" # Primary Key

  attribute {
    name = "email"
    type = "S"
  }

  tags = {
    Name = "QuizGeniusUsers"
  }
}


data "aws_caller_identity" "current" {}
# S3 Bucket: Document Storage (PDFs/TXTs)
resource "aws_s3_bucket" "documents" {
  bucket = "quizgenius-documents-${data.aws_caller_identity.current.account_id}"

  tags = {
    Name = "QuizGenius-Documents"
  }
}

resource "aws_s3_bucket_versioning" "documents" {
  bucket = aws_s3_bucket.documents.id

  versioning_configuration {
    status = "Disabled"
  }
}

# DynamoDB Table: Document Metadata (S3 References)
resource "aws_dynamodb_table" "documents" {
  name           = "QuizGeniusDocuments"
  billing_mode   = "PROVISIONED"
  read_capacity  = 5
  write_capacity = 5
  hash_key       = "document_id"

  attribute {
    name = "document_id"
    type = "S"
  }

  attribute {
    name = "user_email"
    type = "S"
  }

  attribute {
    name = "uploaded_at"
    type = "S"
  }

  global_secondary_index {
    name            = "by_user"
    hash_key        = "user_email"
    range_key       = "uploaded_at"
    read_capacity   = 5
    write_capacity  = 5
    projection_type = "ALL"
  }

  tags = {
    Name = "QuizGeniusDocuments"
  }
}

# DynamoDB Table: Groq AI Quiz Responses (Cache)
resource "aws_dynamodb_table" "groq_responses" {
  name           = "QuizGeniusGroqResponses"
  billing_mode   = "PROVISIONED"
  read_capacity  = 5
  write_capacity = 5
  hash_key       = "document_id"

  attribute {
    name = "document_id"
    type = "S"
  }

  attribute {
    name = "user_email"
    type = "S"
  }

  attribute {
    name = "created_at"
    type = "S"
  }

  global_secondary_index {
    name            = "by_user"
    hash_key        = "user_email"
    range_key       = "created_at"
    read_capacity   = 5
    write_capacity  = 5
    projection_type = "ALL"
  }

  tags = {
    Name = "QuizGeniusGroqResponses"
  }
}

# DynamoDB Table: Historical Quiz Results
resource "aws_dynamodb_table" "quiz_results" {
  name           = "QuizGeniusResults"
  billing_mode   = "PROVISIONED"
  read_capacity  = 5
  write_capacity = 5
  hash_key       = "result_id"

  attribute {
    name = "result_id"
    type = "S"
  }

  attribute {
    name = "user_email"
    type = "S"
  }

  attribute {
    name = "created_at"
    type = "S"
  }

  global_secondary_index {
    name            = "by_user"
    hash_key        = "user_email"
    range_key       = "created_at"
    read_capacity   = 5
    write_capacity  = 5
    projection_type = "ALL"
  }

  tags = {
    Name = "QuizGeniusResults"
  }
}

# Infrastructure Outputs
output "documents_bucket_name" {
  value       = aws_s3_bucket.documents.id
  description = "S3 bucket name for document uploads (set as S3_BUCKET in backend .env)"
}

output "ec2_public_ip" {
  value       = aws_instance.web_server.public_ip
  description = "Public IP of the QuizGenius EC2 instance — visit this in your browser"
}
