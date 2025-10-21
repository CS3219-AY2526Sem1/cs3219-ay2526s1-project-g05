# Collaboration Service

The collaboration service powers PeerPrep's real-time paired programming experience. It
provides a REST API and WebSocket gateway for managing collaborative rooms, synchronising
editor content, coordinating question changes and ensuring that participants can rejoin a
session within a configurable grace period.

## Getting started

```bash
pnpm install
pnpm run dev
```

The service listens on the port defined by `COLLABORATIONSERVICEPORT` (defaults to `4004`).
Swagger documentation is automatically hosted at `/docs`.

## Key capabilities

- Create, join and reconnect to collaboration rooms that support up to two participants.
- Propagate editor operations with optimistic locking and last-write-wins conflict
  resolution.
- Coordinate collaborative question changes that require mutual consent.
- Gracefully handle disconnects with a five-minute reconnection window.
- Expose WebSocket channels (via Socket.IO) for real-time updates consumed by the web app.

## REST API quick reference

All REST endpoints are served from `http://localhost:4004` by default (override the port
with the `COLLABORATIONSERVICEPORT` environment variable). Requests and responses use
JSON. Unless otherwise stated, validation failures return `400`, missing resources return
`404`, and calls made by non-participants return `403`.

### Create a collaboration session

`POST /sessions`

Request body:

```jsonc
{
  "hostUserId": "required string",
  "roomId": "optional custom room id",
  "title": "optional session title",
  "questionId": "optional initial question",
  "language": "optional language (defaults to \"javascript\")",
  "initialCode": "optional starter code"
}
```

Returns `201` with `{ message, session }`. The response `session` object contains the room
id, generated session id, participants array, status and other metadata.

### Fetch an existing session

- `GET /sessions/{sessionId}` – lookup by the internal session identifier.
- `GET /rooms/{roomId}` – lookup by the public room id shown to participants.

Both endpoints return `{ session }` and will fail with `410 Gone` if the collaboration has
already ended.

### Join a session

`POST /sessions/{sessionId}/join`

Request body:

```jsonc
{
  "userId": "required string",
  "displayName": "optional name shown to the partner",
  "username": "legacy alias for displayName"
}
```

The response includes `{ message, session }` where `session.participants` reflects the
current roster. The call returns `409` if the room is full.

### Submit an editor operation

`POST /sessions/{sessionId}/operations`

Request body:

```jsonc
{
  "userId": "required string",
  "version": 3,
  "type": "insert | delete | replace | cursor | selection",
  "content": "required for insert/delete/replace",
  "range": { "start": 0, "end": 5 },
  "cursor": { "line": 10, "column": 2 }
}
```

The service enforces optimistic locking. Responses include `{ message, session, conflict }
` and, when a lock is denied, `{ conflict: true, reason: "lock_conflict", lockedBy }`.

### Leave a session

`POST /sessions/{sessionId}/leave`

```jsonc
{
  "userId": "required string",
  "reason": "optional note",
  "terminateForAll": false
}
```

Participants who leave temporarily have five minutes to reconnect before the session is
auto-ended. Setting `terminateForAll` ends the session immediately.

### Reconnect to a session

`POST /sessions/{sessionId}/reconnect`

```jsonc
{
  "userId": "required string"
}
```

Successful calls reactivate the participant. Attempting to reconnect after the five-minute
window yields `410`.

### Manage question changes

- `POST /sessions/{sessionId}/question/propose` with `{ userId, questionId, rationale? }`
  creates a pending change that both participants must approve.
- `POST /sessions/{sessionId}/question/respond` with `{ userId, accept }` records the
  partner's response. A rejection clears the proposal, while mutual acceptance updates the
  session question and resets the shared code snapshot.

### Request to end a session gracefully

`POST /sessions/{sessionId}/end`

```jsonc
{
  "userId": "required string",
  "confirm": true
}
```

Each participant can toggle their `confirm` flag. When both confirm, the session status is
set to `ended`.

### Administrative termination

`POST /sessions/{sessionId}/terminate`

Only calls with `{ "reason": "admin" }` succeed. This immediately marks the session as
ended and is intended for tooling or moderators.
