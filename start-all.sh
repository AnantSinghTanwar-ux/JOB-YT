#!/bin/bash
echo "Starting Docker Desktop..."
open -a Docker
echo "Waiting for Docker daemon to become responsive (up to 60 seconds)..."
for i in {1..30}; do
  if docker info > /dev/null 2>&1; then
    echo "Docker is up!"
    break
  fi
  sleep 2
done

if ! docker info > /dev/null 2>&1; then
  echo "ERROR: Docker failed to start. You must open Docker Desktop manually."
  exit 1
fi

echo "Starting Postgres and Resume Parser..."
cd /Users/arnavpuggal/Programs/Spazorlabs/Hiring_platform/backend
docker-compose up -d postgres resume-parser

echo "Waiting for Postgres to accept connections..."
sleep 5

echo "Killing any stuck backend processes on port 5001..."
lsof -i :5001 | awk 'NR>1 {print $2}' | xargs kill -9 2>/dev/null

echo "Starting backend..."
npm run dev
