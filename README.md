# Data Ingestion API System

## Overview

This project implements a Data Ingestion API system that processes batches of IDs asynchronously with priority and rate limiting.

### Features

- POST `/ingest`: Submit ingestion request with list of IDs and priority (HIGH, MEDIUM, LOW)
- GET `/status/:ingestionId`: Check status of ingestion batches
- Batches max 3 IDs, processed max 1 batch per 5 seconds
- Prioritized processing of batches
- In-memory persistence (no DB)
- React frontend with user-friendly UI to submit and check status

## Technologies Used

- Backend: Node.js, Express.js
- Frontend: React, Material UI
- Testing: Jest, Supertest

## Setup Instructions

### Backend

1. `cd backend`
2. `npm install`
3. `node index.js` (or `npm start` if script defined)
4. Server runs at `http://localhost:5000`

### Frontend

1. `cd frontend`
2. `npm install`
3. `npm start`
4. App runs at `http://localhost:3000`

### Testing

1. `cd backend`
2. `npm test`

## API Endpoints

- `POST /ingest`
  - Body: `{ ids: [1,2,3], priority: 'HIGH' }`
  - Response: `{ ingestion_id: "<uuid>" }`

- `GET /status/:ingestionId`
  - Response:
  ```json
  {
    "ingestion_id": "...",
    "status": "yet_to_start|triggered|completed",
    "batches": [
      { "batch_id": "...", "ids": [...], "status": "..." }
    ]
  }
