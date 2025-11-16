# Peerprep Backend Service

- The backend uses a micro-service architecure and **pnpm workspaces** to manage everything

# 1. Pre-requisites

- `node 22.19.0 (LTS)`
- `pnpm 10`
  - We are using `pnpm` for package management in order for each microservice to have its own project environment yet still manage it as a whole
  - See install [here](https://pnpm.io/installation)

# 2. Installation

- We assumed you have already **setup the local Docker containers in the [main README.md](../README.md)**

## 2.1 Copy .env file

```
cp .env.example .env
```

- Remember to edit the `OPENAI_API_KEY` variable to use AI features

## 2.2 Install packages in all services

```
pnpm -r install
```

- Voila! You can now run individual services by going into their directories, OR, you can use the following to start **all services**

## 2.3 Start all Microservices

```
pnpm run dev
```

- This triggers the `dev` script in all `services`

## 2.4 Seeding the Backend

- If you require test data, a handy seed script is available

```bash
cd db_management
pnpm run seed
```

## 2.5 [Optional] Working on an individual Microservice (without starting everything!)

```
cd collaboration_service
pnpm add nodemon
pnpm run dev
```

- Each micro-service is its own **npm project**
- Simply use `pnpm` to add dependencies and run scripts
