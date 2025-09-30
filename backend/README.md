# 1. Pre-requisites

- `node 22.19.0 (LTS)`
- `pnpm 10`
  - We are using `pnpm` for package management in order for each microservice to have its own project environment yet still manage it as a whole
  - See install [here](https://pnpm.io/installation)

# 2. Installation

## 2.1 Copy .env file

```
cp .env.example .env
```

- This `.env` file contains the database name MongoDB should use

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

## 2.4 Working on an individual Microservice (without starting everything!)

```
cd collaboration_service
pnpm add nodemon
pnpm run dev
```

- Each micro-service is its own **npm project**
- Simply use `pnpm` to add dependencies and run scripts
