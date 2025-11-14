# User Service API

> Version 1.0.0

Account lifecycle, authentication, and profile maintenance endpoints for PeerPrep.

## Path Table

| Method | Path                                                                               | Description                                         |
| ------ | ---------------------------------------------------------------------------------- | --------------------------------------------------- |
| GET    | [/status](#getstatus)                                                              | Service heartbeat                                   |
| POST   | [/register](#postregister)                                                         | Create a new account                                |
| POST   | [/login](#postlogin)                                                               | Issue a session token                               |
| GET    | [/me](#getme)                                                                      | Fetch the authenticated user's profile              |
| PATCH  | [/me](#patchme)                                                                    | Update the authenticated user's profile             |
| DELETE | [/me](#deleteme)                                                                   | Delete the authenticated user's account             |
| GET    | [/{id}](#getid)                                                                    | Fetch a user by ID (token subject must match `id`)  |
| PATCH  | [/{id}](#patchid)                                                                  | Update a user by ID (token subject must match `id`) |
| DELETE | [/{id}](#deleteid)                                                                 | Delete a user by ID (token subject must match `id`) |
| POST   | [/password-reset/request](#postpassword-resetrequest)                              | Request a password reset link                       |
| POST   | [/password-reset/confirm](#postpassword-resetconfirm)                              | Complete a password reset                           |
| POST   | [/add-current-code-runner](#postadd-current-code-runner)                           | Record the active code runner container for a user  |
| POST   | [/add-past-collaboration-session](#postadd-past-collaboration-session)             | Append a session to a user's collaboration history  |
| POST   | [/update-current-collaboration-session](#postupdate-current-collaboration-session) | Upsert the active collaboration session reference   |

## Reference Table

| Name          | Path                                                                            | Description                                                                     |
| ------------- | ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| bearerAuth    | [#/components/securitySchemes/bearerAuth](#componentssecurityschemesbearerauth) | JWT issued by `/login`, supplied via the `Authorization: Bearer <token>` header |
| User          | [#/components/schemas/User](#componentsschemasuser)                             | Sanitized user resource                                                         |
| ErrorResponse | [#/components/schemas/ErrorResponse](#componentsschemaserrorresponse)           | Standard error envelope for validation or domain failures                       |

## Path Details

### [GET]/status

- Summary  
  Service heartbeat

- Security  

#### Responses

- 200 Success

`application/json`

```javascript
{
  status: "User service is running"
}
```

***

### [POST]/register

- Summary  
  Create a user after validating username, email, and password strength

- Security  

#### Request Body

`application/json`

```javascript
{
  username: string; // 3-30 chars, alphanumeric or underscore
  email: string; // valid email
  password: string; // >=8 chars, incl. uppercase, number, special character
}
```

#### Responses

- 201 Created

`application/json`

```javascript
{
  message: "User registered successfully.",
  user: User
}
```

- 400 Validation failed

`application/json`

```javascript
ErrorResponse
```

- 409 Email or username already taken

`application/json`

```javascript
ErrorResponse
```

***

### [POST]/login

- Summary  
  Authenticate via email/password and obtain a signed JWT valid for 24 hours

- Security  

#### Request Body

`application/json`

```javascript
{
  email: string;
  password: string;
}
```

#### Responses

- 200 Success

`application/json`

```javascript
{
  message: "Login successful.",
  token: string,
  user: User
}
```

- 400 Validation failed

`application/json`

```javascript
ErrorResponse
```

- 401 Invalid email or password

`application/json`

```javascript
ErrorResponse
```

- 423 Account locked due to repeated failures

`application/json`

```javascript
{
  message: "Your account has been temporarily locked. Try again in 15 minutes."
}
```

***

### [GET]/me

- Summary  
  Return the profile for the token subject

- Security  
  bearerAuth  

#### Responses

- 200 Success

`application/json`

```javascript
{
  user: User
}
```

- 401 Missing or invalid token

`application/json`

```javascript
ErrorResponse
```

- 404 User not found

`application/json`

```javascript
ErrorResponse
```

***

### [PATCH]/me

- Summary  
  Update the authenticated user's username, email, or password

- Security  
  bearerAuth  

#### Request Body

`application/json` (at least one field required)

```javascript
{
  username?: string;
  email?: string;
  password?: string;
}
```

#### Responses

- 200 Success

`application/json`

```javascript
{
  message: "User updated successfully.",
  user: User
}
```

- 400 Validation failed or no changes detected

`application/json`

```javascript
ErrorResponse
```

- 401 Missing or invalid token

`application/json`

```javascript
ErrorResponse
```

- 409 Email or username already taken

`application/json`

```javascript
ErrorResponse
```

***

### [DELETE]/me

- Summary  
  Delete the authenticated account after password confirmation

- Security  
  bearerAuth  

#### Request Body

`application/json`

```javascript
{
  password: string;
}
```

#### Responses

- 200 Success

`application/json`

```javascript
{
  message: "User deleted successfully."
}
```

- 400 Password confirmation missing

`application/json`

```javascript
ErrorResponse
```

- 401 Invalid token or password

`application/json`

```javascript
ErrorResponse
```

- 404 User not found

`application/json`

```javascript
ErrorResponse
```

***

### [GET]/{id}

- Summary  
  Fetch a user profile by MongoDB ObjectId; token subject must match `id`

- Security  
  bearerAuth  

#### Responses

- 200 Success

`application/json`

```javascript
{
  user: User
}
```

- 401 Missing or invalid token

`application/json`

```javascript
ErrorResponse
```

- 403 Token subject does not match `id`

`application/json`

```javascript
ErrorResponse
```

- 404 User not found

`application/json`

```javascript
ErrorResponse
```

***

### [PATCH]/{id}

- Summary  
  Update another user document (subject must match `id`)

- Security  
  bearerAuth  

#### Request Body

Identical to [`PATCH /me`](#patchme).

#### Responses

- 200 Success
- 400 Validation failed or no changes detected
- 401 Missing or invalid token
- 403 Token subject does not match `id`
- 404 User not found
- 409 Email or username already taken

All responses reuse payloads shown in [`PATCH /me`](#patchme).

***

### [DELETE]/{id}

- Summary  
  Delete a user document by ID (subject must match `id`)

- Security  
  bearerAuth  

#### Request Body

Identical to [`DELETE /me`](#deleteme).

#### Responses

- 200 Success
- 400 Password confirmation missing
- 401 Missing or invalid token
- 403 Token subject does not match `id`
- 404 User not found

Payloads reuse the shapes defined in [`DELETE /me`](#deleteme).

***

### [POST]/password-reset/request

- Summary  
  Issue a password reset token if the email exists (response is indistinguishable otherwise)

- Security  

#### Request Body

`application/json`

```javascript
{
  email: string;
}
```

#### Responses

- 200 Success (token details omitted in production)

`application/json`

```javascript
{
  message: "If an account exists for that email, a password reset link has been issued.",
  resetToken?: string,
  expiresAt?: string // ISO timestamp, 15 minutes in the future
}
```

- 400 Invalid email

`application/json`

```javascript
ErrorResponse
```

***

### [POST]/password-reset/confirm

- Summary  
  Reset the password using the emailed token and unlock the account

- Security  

#### Request Body

`application/json`

```javascript
{
  token: string;
  password: string; // must satisfy password policy
}
```

#### Responses

- 200 Success

`application/json`

```javascript
{
  message: "Password reset successfully.",
  user: User
}
```

- 400 Invalid or expired token / password does not meet requirements

`application/json`

```javascript
ErrorResponse
```

***

### [POST]/add-current-code-runner

- Summary  
  Store the container ID of the user's active code runner session (internal use)

- Security  
  bearerAuth  

#### Request Body

`application/json`

```javascript
{
  userId: string; // ObjectId string
  containerId: string;
}
```

#### Responses

- 200 Success

`application/json`

```javascript
{
  message: "Current code runner container id added successfully.",
  user: User
}
```

- 401 Missing or invalid token
- 404 User not found

(Error payloads follow `ErrorResponse`.)

***

### [POST]/add-past-collaboration-session

- Summary  
  Append a collaboration session ID if it is not already recorded

- Security  
  bearerAuth  

#### Request Body

`application/json`

```javascript
{
  userId: string;
  sessionId: string;
}
```

#### Responses

- 200 Success

`application/json`

```javascript
{
  message: "Past collaboration session added successfully.",
  user: User
}
```

- 400 Missing or invalid sessionId
- 401 Missing or invalid token
- 404 User not found

Error payloads follow `ErrorResponse`.

***

### [POST]/update-current-collaboration-session

- Summary  
  Update or clear the ID of the user's active collaboration session

- Security  
  bearerAuth  

#### Request Body

`application/json`

```javascript
{
  userId: string;
  sessionId: string | null;
}
```

#### Responses

- 200 Success

`application/json`

```javascript
{
  message: "Current collaboration session updated successfully.",
  user: User
}
```

- 400 Session ID must be a string or null
- 401 Missing or invalid token
- 404 User not found

Error payloads follow `ErrorResponse`.

## References

### #/components/securitySchemes/bearerAuth

```javascript
{
  type: "http",
  scheme: "bearer",
  bearerFormat: "JWT"
}
```

### #/components/schemas/User

```javascript
{
  id: string;
  username: string;
  email: string;
  createdAt: string;
  updatedAt: string;
  failedLoginAttempts: number;
  failedLoginWindowStart: string | null;
  accountLocked: boolean;
  accountLockedAt: string | null;
  codeRunnerServiceUsage?: string | null;
  pastCollaborationSessions: string[];
  collaborationSessionId: string | null;
}
```

### #/components/schemas/ErrorResponse

```javascript
{
  message: string;
  errors?: string[];
}
```
