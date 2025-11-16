# Collaboration Service API

> Version 1.0.0

Add your description

## Path Table

| Method | Path | Description |
| --- | --- | --- |
| POST | [/sessions](#postsessions) | Create a new collaboration session |
| GET | [/sessions/{sessionId}](#getsessionssessionid) | Fetch a collaboration session by its identifier |
| POST | [/sessions/{sessionId}/explain-code](#postsessionssessionidexplain-code) | Generate a new explanation for the code in the collaboration session |
| POST | [/sessions/{sessionId}/conversation](#postsessionssessionidconversation) |  |
| GET | [/sessions/{sessionId}/conversation](#getsessionssessionidconversation) | Fetch the conversation for this collaboration session |
| POST | [/sessions/{sessionId}/message](#postsessionssessionidmessage) |  |
| GET | [/sessions/{sessionId}/message](#getsessionssessionidmessage) | Send a custom message to the AI in the collaboration session |
| POST | [/sessions/:sessionId/terminate](#postsessionssessionidterminate) | [Unused for now] Administrative termination of a collaboration session |

## Reference Table

| Name | Path | Description |
| --- | --- | --- |
| bearerAuth | [#/components/securitySchemes/bearerAuth](#componentssecurityschemesbearerauth) |  |
| SessionParticipant | [#/components/schemas/SessionParticipant](#componentsschemassessionparticipant) | A participant inside a collaboration session. |
| CursorPosition | [#/components/schemas/CursorPosition](#componentsschemascursorposition) | Cursor position object stored per-user in `cursorPositions`. |
| SessionLastOperation | [#/components/schemas/SessionLastOperation](#componentsschemassessionlastoperation) | Information about the last operation applied to the session. |
| PendingQuestionChange | [#/components/schemas/PendingQuestionChange](#componentsschemaspendingquestionchange) | Pending question change proposal for the session. |
| Session | [#/components/schemas/Session](#componentsschemassession) | Sanitized session object returned by the service. |
| Conversation | [#/components/schemas/Conversation](#componentsschemasconversation) | Conversation type |
| sessionsRequest | [#/components/schemas/sessionsRequest](#componentsschemassessionsrequest) | POST /sessions request body schema |
| explainCodeResponse | [#/components/schemas/explainCodeResponse](#componentsschemasexplaincoderesponse) | POST /sessions/{sessionId}/explain-code return body schema |
| conversationResponse | [#/components/schemas/conversationResponse](#componentsschemasconversationresponse) | POST /sessions/{sessionId}/conversation return body schema |
| customMessageResponse | [#/components/schemas/customMessageResponse](#componentsschemascustommessageresponse) | POST /sessions/{sessionId}/message return body schema |

## Path Details

***

### [POST]/sessions

- Summary  
Create a new collaboration session

- Security  
bearerAuth  

#### RequestBody

- application/json

```javascript
// POST /sessions request body schema
{
  participants?: string[]
  // The selected question ID
  questionId?: string
  // The programming language for the session
  language?: string
}
```

#### Responses

- 201 Collaboration session created successfully

`application/json`

```javascript
{
}
```

- 400 A maximum of ${MAX_PARTICIPANTS} participants are allowed per session.

`application/json`

```javascript
{
}
```

- 409 User is already in an active collaboration session.

`application/json`

```javascript
{
}
```

- 500 Internal server error

`application/json`

```javascript
{
}
```

***

### [GET]/sessions/{sessionId}

- Summary  
Fetch a collaboration session by its identifier

- Security  
bearerAuth  

#### Responses

- 200 Success

`application/json`

```javascript
// Sanitized session object returned by the service.
{
  // Session identifier (string form of _id).
  id?: string
  // The selected question ID, or null.
  questionId?: string
  // The current session code (starter or edited), may be empty string or null.
  code?: string
  // Programming language for the session (defaults to "javascript").
  language?: string
  // Numeric version of the session state.
  version?: number
  // Session status (e.g. "active", "ended").
  status?: string
  // Pending question change proposal for the session.
  pendingQuestionChange: {
    // ID of the proposed question.
    questionId?: string
    // User ID who proposed the change.
    proposedBy?: string
    // Optional rationale text.
    rationale?: string
    approvals?: string[]
    // ISO 8601 timestamp when proposal was created.
    createdAt?: string
  }
  // A participant inside a collaboration session.
  participants: {
    // The user identifier.
    userId?: string
    // Display name (may be null).
    displayName?: string
    // Whether the participant is currently connected.
    connected?: boolean
    // ISO timestamp (when participant joined).
    joinedAt?: string
    // ISO timestamp (last seen at before disconnection etc.).
    lastSeenAt?: string
    // ISO timestamp when disconnected or null.
    disconnectedAt?: string
    // ISO timestamp by which participant can reconnect, or null.
    reconnectBy?: string
    // Whether the participant has agreed to end the session
    endConfirmed?: boolean
  }[]
  // Object of userId => CursorPosition objects.
  cursorPositions: {
  }
  // Information about the last operation applied to the session.
  lastOperation: {
    // ID of the user who performed the operation.
    userId?: string
    // Operation type (e.g. "insert", "delete", "cursor", "selection").
    type?: string
    // Session version after the operation.
    version?: number
    // ISO timestamp when operation occurred.
    timestamp?: string
    // Whether the operation caused a conflict.
    conflict?: boolean
  }
  endRequests?: string[]
  // ISO timestamp when session was created.
  createdAt?: string
  // ISO timestamp when session was last updated.
  updatedAt?: string
}
```

- 404 Collaboration session not found

`application/json`

```javascript
{
}
```

- 500 Internal server error

`application/json`

```javascript
{
}
```

***

### [POST]/sessions/{sessionId}/explain-code

- Summary  
Generate a new explanation for the code in the collaboration session

- Security  
bearerAuth  

#### Responses

- 200 Success

`application/json`

```javascript
// POST /sessions/{sessionId}/explain-code return body schema
{
  // Conversation type
  conversation: {
    // The type of the conversation message [e.g., "message", "reasoning"]
    type?: string
    // The content of the conversation message
    content?: string
    // The role of the msg, it is from assistant or user
    role?: string
  }[]
  // Text of this specific explanation
  response?: string
}
```

- 404 Collaboration session not found

`application/json`

```javascript
{
}
```

- 500 Internal server error

`application/json`

```javascript
{
}
```

***

### [POST]/sessions/{sessionId}/conversation

- Security  

#### Responses

***

### [GET]/sessions/{sessionId}/conversation

- Summary  
Fetch the conversation for this collaboration session

- Security  
bearerAuth  

#### Responses

- 200 Success

`application/json`

```javascript
// POST /sessions/{sessionId}/conversation return body schema
{
  // Conversation type
  conversation: {
    // The type of the conversation message [e.g., "message", "reasoning"]
    type?: string
    // The content of the conversation message
    content?: string
    // The role of the msg, it is from assistant or user
    role?: string
  }[]
  // OpenAI id of the conversation
  conversationId?: string
}
```

- 404 Collaboration session not found

`application/json`

```javascript
{
}
```

- 500 Internal server error

`application/json`

```javascript
{
}
```

***

### [POST]/sessions/{sessionId}/message

- Security  

#### Responses

***

### [GET]/sessions/{sessionId}/message

- Summary  
Send a custom message to the AI in the collaboration session

- Security  
bearerAuth  

#### Responses

- 200 Success

`application/json`

```javascript
// POST /sessions/{sessionId}/message return body schema
{
  // Conversation type
  conversation: {
    // The type of the conversation message [e.g., "message", "reasoning"]
    type?: string
    // The content of the conversation message
    content?: string
    // The role of the msg, it is from assistant or user
    role?: string
  }[]
  // -The response to the custom message
  response?: string
}
```

- 404 Collaboration session not found

`application/json`

```javascript
{
}
```

- 500 Internal server error

`application/json`

```javascript
{
}
```

***

### [POST]/sessions/:sessionId/terminate

- Summary  
[Unused for now] Administrative termination of a collaboration session

- Security  

#### Responses

## References

### #/components/securitySchemes/bearerAuth

```javascript
{
  "type": "http",
  "scheme": "bearer",
  "bearerFormat": "JWT"
}
```

### #/components/schemas/SessionParticipant

```javascript
// A participant inside a collaboration session.
{
  // The user identifier.
  userId?: string
  // Display name (may be null).
  displayName?: string
  // Whether the participant is currently connected.
  connected?: boolean
  // ISO timestamp (when participant joined).
  joinedAt?: string
  // ISO timestamp (last seen at before disconnection etc.).
  lastSeenAt?: string
  // ISO timestamp when disconnected or null.
  disconnectedAt?: string
  // ISO timestamp by which participant can reconnect, or null.
  reconnectBy?: string
  // Whether the participant has agreed to end the session
  endConfirmed?: boolean
}
```

### #/components/schemas/CursorPosition

```javascript
// Cursor position object stored per-user in `cursorPositions`.
{
  // Optional line index.
  line?: number
  // Optional character/column index.
  ch?: number
  // ISO 8601 timestamp when this cursor was last updated.
  updatedAt?: string
}
```

### #/components/schemas/SessionLastOperation

```javascript
// Information about the last operation applied to the session.
{
  // ID of the user who performed the operation.
  userId?: string
  // Operation type (e.g. "insert", "delete", "cursor", "selection").
  type?: string
  // Session version after the operation.
  version?: number
  // ISO timestamp when operation occurred.
  timestamp?: string
  // Whether the operation caused a conflict.
  conflict?: boolean
}
```

### #/components/schemas/PendingQuestionChange

```javascript
// Pending question change proposal for the session.
{
  // ID of the proposed question.
  questionId?: string
  // User ID who proposed the change.
  proposedBy?: string
  // Optional rationale text.
  rationale?: string
  approvals?: string[]
  // ISO 8601 timestamp when proposal was created.
  createdAt?: string
}
```

### #/components/schemas/Session

```javascript
// Sanitized session object returned by the service.
{
  // Session identifier (string form of _id).
  id?: string
  // The selected question ID, or null.
  questionId?: string
  // The current session code (starter or edited), may be empty string or null.
  code?: string
  // Programming language for the session (defaults to "javascript").
  language?: string
  // Numeric version of the session state.
  version?: number
  // Session status (e.g. "active", "ended").
  status?: string
  // Pending question change proposal for the session.
  pendingQuestionChange: {
    // ID of the proposed question.
    questionId?: string
    // User ID who proposed the change.
    proposedBy?: string
    // Optional rationale text.
    rationale?: string
    approvals?: string[]
    // ISO 8601 timestamp when proposal was created.
    createdAt?: string
  }
  // A participant inside a collaboration session.
  participants: {
    // The user identifier.
    userId?: string
    // Display name (may be null).
    displayName?: string
    // Whether the participant is currently connected.
    connected?: boolean
    // ISO timestamp (when participant joined).
    joinedAt?: string
    // ISO timestamp (last seen at before disconnection etc.).
    lastSeenAt?: string
    // ISO timestamp when disconnected or null.
    disconnectedAt?: string
    // ISO timestamp by which participant can reconnect, or null.
    reconnectBy?: string
    // Whether the participant has agreed to end the session
    endConfirmed?: boolean
  }[]
  // Object of userId => CursorPosition objects.
  cursorPositions: {
  }
  // Information about the last operation applied to the session.
  lastOperation: {
    // ID of the user who performed the operation.
    userId?: string
    // Operation type (e.g. "insert", "delete", "cursor", "selection").
    type?: string
    // Session version after the operation.
    version?: number
    // ISO timestamp when operation occurred.
    timestamp?: string
    // Whether the operation caused a conflict.
    conflict?: boolean
  }
  endRequests?: string[]
  // ISO timestamp when session was created.
  createdAt?: string
  // ISO timestamp when session was last updated.
  updatedAt?: string
}
```

### #/components/schemas/Conversation

```javascript
// Conversation type
{
  // The type of the conversation message [e.g., "message", "reasoning"]
  type?: string
  // The content of the conversation message
  content?: string
  // The role of the msg, it is from assistant or user
  role?: string
}
```

### #/components/schemas/sessionsRequest

```javascript
// POST /sessions request body schema
{
  participants?: string[]
  // The selected question ID
  questionId?: string
  // The programming language for the session
  language?: string
}
```

### #/components/schemas/explainCodeResponse

```javascript
// POST /sessions/{sessionId}/explain-code return body schema
{
  // Conversation type
  conversation: {
    // The type of the conversation message [e.g., "message", "reasoning"]
    type?: string
    // The content of the conversation message
    content?: string
    // The role of the msg, it is from assistant or user
    role?: string
  }[]
  // Text of this specific explanation
  response?: string
}
```

### #/components/schemas/conversationResponse

```javascript
// POST /sessions/{sessionId}/conversation return body schema
{
  // Conversation type
  conversation: {
    // The type of the conversation message [e.g., "message", "reasoning"]
    type?: string
    // The content of the conversation message
    content?: string
    // The role of the msg, it is from assistant or user
    role?: string
  }[]
  // OpenAI id of the conversation
  conversationId?: string
}
```

### #/components/schemas/customMessageResponse

```javascript
// POST /sessions/{sessionId}/message return body schema
{
  // Conversation type
  conversation: {
    // The type of the conversation message [e.g., "message", "reasoning"]
    type?: string
    // The content of the conversation message
    content?: string
    // The role of the msg, it is from assistant or user
    role?: string
  }[]
  // -The response to the custom message
  response?: string
}
```