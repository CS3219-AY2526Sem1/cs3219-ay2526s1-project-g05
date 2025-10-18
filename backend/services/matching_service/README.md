# Matching Service

## Overview
The Matching Service is an Express-based microservice that manages user matchmaking for PeerPrep. It boots through `MatchingServiceApplication`, which configures security middleware, exposes a `/status` health check, and mounts the REST API under `/api/matching`. 【F:backend/services/matching_service/src/MatchingServiceApplication.js】

## Key capabilities
- **User queueing** - user joins the queue by providing the user JSON object, and the criteria string object. A unique `sessionId` based on the user's id field in the JSON object is given to the user upon successful enqueueing. 【F:backend/services/matching_service/src/MatchingController.js】
- **Match status check** - user can get their match status by calling the uri `/api/matching/status/:sessionId`. If the user has not been matched yet, a persistent connection with the server is created. The server utilizes Server-Sent Events (SSE) to notify the user when they have been matched and closes the connection.【F:backend/services/matching_service/src/MatchingController.js】
- **Session timeout** - users that timeout from queueing for over 5 minutes will be notified in using SSE as well.【F:backend/services/matching_service/src/MatchingController.js】

## API surface
All endpoints are prefixed with `/api/matching` via the service router. 【F:backend/services/matching_service/src/routes/matchingRoutes.js】

| Method & Path | Description |
| --- | --- |
| `POST /queue` | Queues a user after checking for duplicate user id. |
| `GET /status/:sessionId` | Sets up a persistent connection with the service to receive updates on matching status. |
| `POST /cancel` | Exits the queue prematurely if the user has not been matched yet. |

## Example requests
The service listens on port `4003` by default. 【F:backend/services/matching_service/index.js†L1-L6】

### Join queue as user with question criteria set to hard
```bash
curl -X POST http://localhost:4003/matching/queue \
  -H "Content-Type: application/json" \
  -d '{
    "user": { "name": "pauline", "id": "1" },
    "criteria": { "difficulty": "hard", "topics": ["dp", "tree"] }
  }'
```

### Get match status for queued user
```bash
curl http://localhost:4003/matching/status/session-1-c7932e53-2e21-47ac-8c94-7fa78a118a41
```

### Confirm match for a matched user
```bash
curl -X POST http://localhost:4003/matching/confirm \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "session-1-c7932e53-2e21-47ac-8c94-7fa78a118a41"
  }'
```

### Cancel match for a queued user
```bash
curl -X POST http://localhost:4003/matching/cancel \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "session-1-c7932e53-2e21-47ac-8c94-7fa78a118a41"
  }'
```

## Architecture
- **Controller layer** – handles all networking requests and responses. Also maintains a list of active sessions and their response objects.【F:backend/services/matching_service/src/controllers/MatchingController.js】
- **Service layer** – provides functionalities for sessionId creation, user queue handling, notifying made matches, and cleaning up stale sessions.【F:backend/services/matching_service/src/services/MatchingService.js】
- **Repository layer** – communicates with the Redis database for storing of users in queue, matched and pending users, users actively awaiting matches, and a list of user sessions and user names for internal checks.【F:backend/services/matching_service/src/repositories/MatchingRepository.js】

## Configuration
The service reads the MongoDB database name from `backend/.env`, which you can scaffold from the template. 【F:backend/.env.example】

```bash
cd backend
cp .env.example .env
```

## Running locally
1. Install dependencies with pnpm (the repo uses pnpm workspaces). 【F:backend/services/matching_service/package.json】
   ```bash
   cd backend
   pnpm -r install
   ```
2. Start just the Matching Service:
   ```bash
   cd services/matching_service
   pnpm run dev
   ```
   This runs `nodemon index.js`, which boots the service on port `4003` by default. 【F:backend/services/matching_service/package.json】【F:backend/services/matching_service/index.js】

## Error handling
Domain failures throw `ApiError` instances that encode status codes and optional details. The controller’s error middleware converts them into JSON responses, while unexpected errors return a generic 500 payload. 【F:backend/services/matching_service/src/controllers/MatchingController.js】