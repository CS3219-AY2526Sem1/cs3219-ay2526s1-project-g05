# User Service

## Overview
The User Service is an Express-based microservice that manages account registration, authentication, profile maintenance, deletion, and password resets for PeerPrep. It boots through `UserApplication`, which wires shared MongoDB connectivity, configures security middleware, exposes a `/status` health check, and mounts the REST API under `/api/users`. 【F:backend/services/user_service/src/UserApplication.js】

## Key capabilities
- **Account lifecycle** – create, fetch, update, and delete users, with Argon2id hashing to protect stored credentials. 【F:backend/services/user_service/src/services/UserService.js】【F:backend/services/user_service/src/security/PasswordHasher.js】
- **Authentication safety** – throttles repeated failures and automatically locks compromised accounts using the `LoginSecurityManager`. 【F:backend/services/user_service/src/services/UserService.js】【F:backend/services/user_service/src/security/LoginSecurityManager.js】
- **Password recovery** – issues short-lived reset tokens and unlocks accounts upon successful resets. 【F:backend/services/user_service/src/services/UserService.js】
- **Transport protections** – enforces HSTS headers everywhere and requires HTTPS in production deployments. 【F:backend/services/user_service/src/middleware/securityHeaders.js 】【F:backend/services/user_service/src/middleware/enforceHttps.js】

## API surface
All endpoints are prefixed with `/api/users` via the service router. 【F:backend/services/user_service/src/routes/userRoutes.js】

| Method & Path | Description |
| --- | --- |
| `POST /register` | Register a new user after validating username, email, and password strength. |
| `POST /login` | Authenticate with email and password; locks the account after repeated failures. |
| `GET /:id` | Retrieve a sanitized user profile by ID. |
| `PATCH /:id` | Update email, username, or password (rehashed automatically). |
| `DELETE /:id` | Remove the account after confirming the password. |
| `POST /password-reset/request` | Request a password reset; returns the token only outside production. |
| `POST /password-reset/confirm` | Reset the password with a valid token and unlock the account. |
| `GET /status` | Health probe exposed at the root of the service. |

## Example requests
The service listens on port `4001` by default. 【F:backend/services/user_service/index.js†L1-L26】

### Register a user
```bash
curl -X POST http://localhost:4001/api/users/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "dev_alex",
    "email": "alex@example.com",
    "password": "S3cur3!Pass"
  }'
```

Successful response (`201 Created`):

```json
{
  "message": "User registered successfully.",
  "user": {
    "id": "665b4c2f8f720b6f83b7419d",
    "username": "dev_alex",
    "email": "alex@example.com",
    "createdAt": "2024-10-12T14:48:00.000Z",
    "updatedAt": "2024-10-12T14:48:00.000Z"
  }
}
```

### Log in
```bash
curl -X POST http://localhost:4001/api/users/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "alex@example.com",
    "password": "S3cur3!Pass"
  }'
```

Successful response (`200 OK`):

```json
{
  "message": "Login successful.",
  "user": {
    "id": "665b4c2f8f720b6f83b7419d",
    "username": "dev_alex",
    "email": "alex@example.com",
    "createdAt": "2024-10-12T14:48:00.000Z",
    "updatedAt": "2024-10-12T15:02:11.000Z"
  }
}
```

### Fetch a user profile
```bash
curl http://localhost:4001/api/users/<mongo_db _id>
curl http://localhost:4001/api/users/665b4c2f8f720b6f83b7419d
```

Successful response (`200 OK`):

```json
{
  "user": {
    "id": "665b4c2f8f720b6f83b7419d",
    "username": "dev_alex",
    "email": "alex@example.com",
    "createdAt": "2024-10-12T14:48:00.000Z",
    "updatedAt": "2024-10-12T15:02:11.000Z"
  }
}
```

### Update an account
```bash
curl -X PATCH http://localhost:4001/api/users/665b4c2f8f720b6f83b7419d \
  -H "Content-Type: application/json" \
  -d '{
    "username": "dev_alexander",
    "password": "N3wP@ssword!"
  }'
```

Successful response (`200 OK`):

```json
{
  "message": "User updated successfully.",
  "user": {
    "id": "665b4c2f8f720b6f83b7419d",
    "username": "dev_alexander",
    "email": "alex@example.com",
    "createdAt": "2024-10-12T14:48:00.000Z",
    "updatedAt": "2024-10-12T15:30:45.000Z"
  }
}
```

### Delete an account (requires password confirmation)
```bash
curl -X DELETE http://localhost:4001/api/users/665b4c2f8f720b6f83b7419d \
  -H "Content-Type: application/json" \
  -d '{ "password": "N3wP@ssword!" }'
```

Successful response (`200 OK`):

```json
{ "message": "User deleted successfully." }
```

### Request a password reset
```bash
curl -X POST http://localhost:4001/api/users/password-reset/request \
  -H "Content-Type: application/json" \
  -d '{ "email": "alex@example.com" }'
```

Successful response (`200 OK`):

```json
{
  "message": "If an account exists for that email, a password reset link has been issued.",
  "resetToken": "3a0f7b8ccf8042d78ee75c74d0a71b35",
  "expiresAt": "2024-10-12T15:55:00.000Z"
}
```

> In production, `resetToken` and `expiresAt` are omitted from the response body. 【F:backend/services/user_service/src/controllers/UserController.js†L38-L51】

### Confirm a password reset
```bash
curl -X POST http://localhost:4001/api/users/password-reset/confirm \
  -H "Content-Type: application/json" \
  -d '{
    "token": "3a0f7b8ccf8042d78ee75c74d0a71b35",
    "password": "Rest0red!Pass"
  }'
```

Successful response (`200 OK`):

```json
{
  "message": "Password reset successfully.",
  "user": {
    "id": "665b4c2f8f720b6f83b7419d",
    "username": "dev_alexander",
    "email": "alex@example.com",
    "createdAt": "2024-10-12T14:48:00.000Z",
    "updatedAt": "2024-10-12T15:58:22.000Z"
  }
}
```

## Architecture
- **Controller layer** – translates HTTP requests into service calls, standardizes success payloads, and funnels errors through a shared middleware. 【F:backend/services/user_service/src/controllers/UserController.js】
- **Service layer** – houses business rules for validation, uniqueness checks, credential hashing, login lockouts, and reset workflows. 【F:backend/services/user_service/src/services/UserService.js】
- **Repository layer** – wraps the `users` MongoDB collection with helpers for CRUD operations, unique indexes, and reset-token lookups. 【F:backend/services/user_service/src/repositories/UserRepository.js】
- **Validation & security utilities** – reusable validators and hashing/lockout helpers guarantee consistent input normalization and security posture. 【F:backend/services/user_service/src/validators/UserValidator.js】【F:backend/services/user_service/src/security/PasswordHasher.js】【F:backend/services/user_service/src/security/LoginSecurityManager.js】

## Configuration
The service reads the MongoDB database name from `backend/.env`, which you can scaffold from the template. 【F:backend/.env.example】

```bash
cd backend
cp .env.example .env
```

## Running locally
1. Install dependencies with pnpm (the repo uses pnpm workspaces). 【F:backend/services/user_service/package.json L1-L24】
   ```bash
   cd backend
   pnpm -r install
   ```
2. Ensure a MongoDB instance is reachable at `mongodb://localhost:27017` and that `MONGO_DB_NAME` in `.env` points to the desired database. 【F:backend/common_scripts/mongo.js L1-L43】
3. Start just the User Service:
   ```bash
   cd services/user_service
   pnpm run dev
   ```
   This runs `nodemon index.js`, which boots the service on port `4001` by default. 【F:backend/services/user_service/package.json L5-L18】【F:backend/services/user_service/index.js L1-L26】

## Error handling
Domain failures throw `ApiError` instances that encode status codes and optional details. The controller’s error middleware converts them into JSON responses, while unexpected errors return a generic 500 payload. 【F:backend/services/user_service/src/controllers/UserController.js L1-L86】
