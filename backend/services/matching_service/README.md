# Matching Service

![](../../../docs/Matching%20Service.png)

## Overview

The Matching Service is an Express-based microservice that manages user matchmaking for PeerPrep. It boots through `MatchingServiceApplication`, and exposes a `/health` health check.

## Configuration

The service reads the Redis database name from `backend/.env`, which you can scaffold from the template.

```bash
cd backend
cp .env.example .env
```

## Getting started

1. Install dependencies with pnpm (the repo uses pnpm workspaces).
   
   ```bash
   cd backend
   pnpm -r install
   ```
2. Start just the Matching Service:
   
   ```bash
   cd services/matching_service
   pnpm run dev
   ```

The service listens on the port defined by `MATCHINGSERVICEPORT` (defaults to `4003`).
Swagger documentation is automatically hosted at `/docs`.

## Key capabilities

- **User queueing** - user joins the queue by providing the user JSON object, and the criteria string object. A unique `sessionId` based on the user's id field in the JSON object is given to the user upon successful enqueueing.
- **Match status check** - user can get their match status by calling the uri `/status/:sessionId`. If the user has not been matched yet, a persistent connection with the server is created. The server utilizes Server-Sent Events (SSE) to notify the user when they have been matched and closes the connection.
- **Session and Match timeout** - users that timeout from queueing for over 5 minutes and users that timeout from not responding to a match found event will be notified using SSE as well.
- **Match confirmation** - once 2 users have been matched based on their chosen criterias and difficulty of technical interview questions, they have to confirm their match to enter a collaboration session with each other.
- **Queue exiting** - users can choose to exit from the matchmaking queue prematurely.

## API surface

- You can also refer to the auto-generated API docs at [api_docs.md](api_docs.md) for full types

The API endpoints are not prefixed in development, they are simply `http://localhost:4003/`. In production, they are prefixed with `api/` because of the way NGINX adds an `api/` prefix to the URI of backend code.

| Method & Path         | Description                                                                             |
| --------------------- | --------------------------------------------------------------------------------------- |
| `POST /queue`         | Enters a user into the matching queue.                                                  |
| `GET /?token={token}` | Sets up a persistent connection with the service to receive updates on matching status. |
| `POST /cancel`        | Cancels the session, removing it from the queue and any pending match states.           |
| `POST /confirm`       | Confirms participation in a pending match (Three-Way Handshake step 2).                 |
| `GET /is_in_queue`    | Checks whether the user is currently in the matching queue.                             |

### Join queue as user with question criteria set to hard and question topics as Dynamic Programming and Binary Tree

```bash
curl -X POST http://localhost:4003/queue \
  -H "Content-Type: application/json" \
  -d '{
    "user": { "name": "Pauline", "id": "1" },
    "criteria": { "difficulty": "Hard", "topics": ["Dynamic Programming", "Binary Tree"] }
  }'
```

### Get match status for queued user

```bash
curl http://localhost:4003/?token=1
```

### Confirm match for a matched user

```bash
curl -X POST http://localhost:4003/confirm \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "1"
  }'
```

### Cancel match for a queued user

```bash
curl -X POST http://localhost:4003/cancel \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "1"
  }'
```

## Architecture

- **Controller layer** – handles all networking requests and responses. Also maintains a list of active sessions and their response objects.
- **Service layer** – provides functionalities for user queue handling, notifying users using SSE, and cleaning up stale sessions and matches.
- **Repository layer** – communicates with the Redis database for storing of users in queue, users' queue data, users in a match, match datas, and a list of user listeners. Also handles the user matching by question criteria and topic.

## Error handling

Domain failures throw `ApiError` instances that encode status codes and optional details. The controller’s error middleware converts them into JSON responses, while unexpected errors return a generic 500 payload.