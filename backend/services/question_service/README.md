# Question Service

This module contains the code for the `Question` micro-service, which serves to retrieve questions from the `questions_collection`

![](../../../docs/Question_Service.drawio.png)

## 1. Pre-requisites

- `node 22.19.0 (LTS)`

- `pnpm 10.17.1`

## 2. Installation

- **Note:** This micro-service requires the root repository dependencies + MongoDB to be running to function properly

```
pnpm install
```

## 3. Run in Dev Mode

```
pnpm run dev
```

## 4. Run in Production Mode

```
pnpm run start
```

## 5. Testing

```
pnpm run test
```

## 6. API Docs

- Refer to [api_docs.md](api_docs.md)

## 7. Schema + Indexes

![](../../../docs/Schemas.drawio.png)

![](../../../docs/Indexes.png)
