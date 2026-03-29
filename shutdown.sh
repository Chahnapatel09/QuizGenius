#!/bin/bash

# QuizGenius Shutdown Script
# Stops local Docker services and frees ports (80, 3001) and memory.

set -e

cd "$(dirname "$0")" || exit 1

echo "Shutting down QuizGenius (local Docker)..."

if docker compose version &>/dev/null; then
  docker compose down --remove-orphans
elif command -v docker-compose &>/dev/null; then
  docker-compose down --remove-orphans
else
  echo "ERROR: Docker Compose not found. Install Docker Desktop or docker-compose."
  exit 1
fi

echo "QuizGenius local containers are stopped."
echo "Your code and data are safe (volumes are preserved unless you removed them manually)."
echo "To deploy to AWS, run: ./deploy.sh"
echo "To run locally again: docker compose up --build -d"
