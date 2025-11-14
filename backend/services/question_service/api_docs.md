# Question Service API

> Version 1.0.0

Add your description

## Path Table

| Method | Path | Description |
| --- | --- | --- |
| GET | [/status](#getstatus) | Heartbeat for the question service |
| GET | [/](#get) | Gets list of questions, optionally filtered by topic and/or difficulty |
| GET | [/random](#getrandom) | Gets a random question, optionally filtered by topic and/or difficulty |
| GET | [/{id}](#getid) | Gets the question by its Question ID |

## Reference Table

| Name | Path | Description |
| --- | --- | --- |
| bearerAuth | [#/components/securitySchemes/bearerAuth](#componentssecurityschemesbearerauth) |  |

## Path Details

***

### [GET]/status

- Summary  
Heartbeat for the question service

- Security  

#### Responses

- 200 success response

`application/json`

```typescript
{
}
```

***

### [GET]/

- Summary  
Gets list of questions, optionally filtered by topic and/or difficulty

- Security  
bearerAuth  

#### Parameters(Query)

```typescript
topic?: string[]
```

```typescript
difficulty?: string[]
```

```typescript
search?: string
```

#### Responses

- 200 Success

`application/json`

```typescript
{
}[]
```

- 400 Bad Request (e.g invalid topic or difficulty)

`application/json`

```typescript
{
}
```

***

### [GET]/random

- Summary  
Gets a random question, optionally filtered by topic and/or difficulty

- Security  
bearerAuth  

#### Parameters(Query)

```typescript
topic?: string[]
```

```typescript
difficulty?: string[]
```

#### Responses

- 200 Success

`application/json`

```typescript
{
}
```

- 400 Bad Request (e.g invalid topic or difficulty)

`application/json`

```typescript
{
}
```

***

### [GET]/{id}

- Summary  
Gets the question by its Question ID

- Security  
bearerAuth  

#### Responses

- 200 Success

`application/json`

```typescript
{
}
```

- 404 Question not found

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