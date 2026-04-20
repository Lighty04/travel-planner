#!/bin/bash
# Start PostgreSQL in Docker for Travel Planner

docker run -d \
  --name travel-planner-db \
  -e POSTGRES_USER=travelplanner \
  -e POSTGRES_PASSWORD=travelplanner \
  -e POSTGRES_DB=travel_planner \
  -v travel_planner_data:/var/lib/postgresql/data \
  -p 5432:5432 \
  --restart unless-stopped \
  postgres:16-alpine
