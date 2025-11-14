# Matching Service API

> Version 1.0.0

Add your description

## Path Table

| Method | Path                                           | Description                                                                       |
| ------ | ---------------------------------------------- | --------------------------------------------------------------------------------- |
| POST   | [/queue](#postqueue)                           | Enters a user into the matching queue.                                            |
| GET    | [/status/?token={token}](#getstatustokentoken) | Creates a Server-Sent Events (SSE) connection for real-time match status updates. |
| POST   | [/cancel](#postcancel)                         | Cancels the session, removing it from the queue and any pending match states.     |
| POST   | [/confirm](#postconfirm)                       | Confirms participation in a pending match (Three-Way Handshake step 2).           |
| GET    | [/is_in_queue_match](#getis_in_queue_match)    | Checks if the currently authenticated user is in the queue or in a pending match. |

## Reference Table

| Name             | Path                                                                            | Description                                                     |
| ---------------- | ------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| bearerAuth       | [#/components/securitySchemes/bearerAuth](#componentssecurityschemesbearerauth) |                                                                 |
| User             | [#/components/schemas/User](#componentsschemasuser)                             | User object (passed by frontend, authenticated via middleware). |
| MatchingCriteria | [#/components/schemas/MatchingCriteria](#componentsschemasmatchingcriteria)     | Matching criteria object.                                       |
| QueueRequest     | [#/components/schemas/QueueRequest](#componentsschemasqueuerequest)             | Request body for entering the queue.                            |
| SessionIdRequest | [#/components/schemas/SessionIdRequest](#componentsschemassessionidrequest)     | Request body for matching actions (cancel/confirm).             |

## Path Details

***

### [POST]/queue

- Summary  
  Enters a user into the matching queue.

- Description  
  Adds the user to the queue and immediately attempts to find a match. Returns a sessionId for status tracking.

- Security  
  bearerAuth  

#### RequestBody

- application/json

```typescript
// Request body for entering the queue.
{
  // User object (passed by frontend, authenticated via middleware).
  user: {
    // The user's primary identifier (must have this minimally).
    id?: string
    // The user's display name.
    username?: string
  }
  // Matching criteria object.
  criteria: {
    // The desired question difficulty.
    difficulty?: #/components/schemas/[object Object] | #/components/schemas/[object Object] | #/components/schemas/[object Object]
    topics?: string[]
  }
}
```

#### Responses

- 202 Match request accepted, includes the sessionId for tracking.

`application/json`

```typescript
{
}
```

- 400 Validation failed (e.g., criteria missing).

`application/json`

```typescript
{
}
```

- 500 Internal server error.

`application/json`

```typescript
{
}
```

***

### [GET]/status/?token={token}

- Summary  
  Creates a Server-Sent Events (SSE) connection for real-time match status updates.

- Description  
  Keeps the connection open. Sends 'matchFound', 'matchFinalized', 'matchCancelled', 'sessionExpired', or 'rejoinedQueue' events.

- Security  
  bearerAuth  

#### Parameters(Query)

```typescript
token: string
```

#### Responses

- 200 An SSE stream.

`application/json`

- 400 An active SSE connection already exists for this session.

`application/json`

```typescript
{
}
```

- 401 Unauthorized (e.g., invalid or missing token).

`application/json`

```typescript
{
}
```

- 404 Session ID not found in the queue.

`application/json`

```typescript
{
}
```

***

### [POST]/cancel

- Summary  
  Cancels the session, removing it from the queue and any pending match states.

- Description  
  Used to voluntarily exit the queue or a pending match before confirmation.

- Security  
  bearerAuth  

#### RequestBody

- application/json

```typescript
// Request body for matching actions (cancel/confirm).
{
  // The current session identifier (e.g., "user.id: 12441313").
  sessionId?: string
}
```

#### Responses

- 200 Success message.

`application/json`

```typescript
{
}
```

- 400 Bad Request (e.g., missing sessionId).

`application/json`

```typescript
{
}
```

***

### [POST]/confirm

- Summary  
  Confirms participation in a pending match (Three-Way Handshake step 2).

- Description  
  Saves the user's confirmation status. If both users have confirmed, the match is finalized.

- Security  
  bearerAuth  

#### RequestBody

- application/json

```typescript
// Request body for matching actions (cancel/confirm).
{
  // The current session identifier (e.g., "user.id: 12441313").
  sessionId?: string
}
```

#### Responses

- 400 Match already confirmed.

`application/json`

```typescript
{
}
```

- 404 Pending match not found or expired.

`application/json`

```typescript
{
}
```

***

### [GET]/is_in_queue_match

- Summary  
  Checks if the currently authenticated user is in the queue or in a pending match.

- Description  
  Used primarily by other services (e.g., User Service) or the client for pre-session checks.

- Security  
  bearerAuth  

#### Responses

- 200 { isWaiting: boolean, matchId: string|null }.

`application/json`

```typescript
{
}
```

- 401 Unauthorized (missing or invalid token).

`application/json`

```typescript
{
}
```

## References

### #/components/securitySchemes/bearerAuth

```typescript
{
  "type": "http",
  "scheme": "bearer",
  "bearerFormat": "JWT"
}
```

### #/components/schemas/User

```typescript
// User object (passed by frontend, authenticated via middleware).
{
  // The user's primary identifier (must have this minimally).
  id?: string
  // The user's display name.
  username?: string
}
```

### #/components/schemas/MatchingCriteria

```typescript
// Matching criteria object.
{
  // The desired question difficulty.
  difficulty?: #/components/schemas/[object Object] | #/components/schemas/[object Object] | #/components/schemas/[object Object]
  topics?: string[]
}
```

### #/components/schemas/QueueRequest

```typescript
// Request body for entering the queue.
{
  // User object (passed by frontend, authenticated via middleware).
  user: {
    // The user's primary identifier (must have this minimally).
    id?: string
    // The user's display name.
    username?: string
  }
  // Matching criteria object.
  criteria: {
    // The desired question difficulty.
    difficulty?: #/components/schemas/[object Object] | #/components/schemas/[object Object] | #/components/schemas/[object Object]
    topics?: string[]
  }
}
```

### #/components/schemas/SessionIdRequest

```typescript
// Request body for matching actions (cancel/confirm).
{
  // The current session identifier (e.g., "user.id: 12441313").
  sessionId?: string
}
```