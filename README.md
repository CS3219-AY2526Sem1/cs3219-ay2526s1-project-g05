[![Review Assignment Due Date](https://classroom.github.com/assets/deadline-readme-button-22041afd0340ce965d47ae6ef1cefeee28c7c493a6346c4f15d667ab976d596c.svg)](https://classroom.github.com/a/QUdQy4ix)

# CS3219 Project (PeerPrep) - AY2526S1

## Group: G05

### Note:

- You are required to develop individual microservices within separate folders within this repository.
- The teaching team should be given access to the repositories as we may require viewing the history of the repository in case of any disputes or disagreements.

![Logo](images/logo.png)

# Table of Contents

- [1. Product Overview](#1-product-overview)
- [2. Project Architecture](#2-project-architecture)
- [3. Pre-requisites](#3-pre-requisites)
- [4. Installation & Setup](#4-installation-and-setup)

# 1. Product Overview

## 1.1 Key Features

- Real-time Matchmaking: Users are matched instantly based on chosen difficulty and topics.
- Collaborative Code Editor: Synchronous, low-latency coding environment.

## 1.2 Product Visualizations

![Landing Page](images/LandingPage.png)
![Login Page](images/LoginPage.png)
![MatchMaking Page](images/MatchMakingPage.png)
![Collaboration Page](images/CollaborationPage.png)

# 2. Project Architecture

PeerPrep is implemented using a Microservices Architecture to ensure scalability and separation of concerns.
| Service | Role | Tech Stack | Port |
| --- | --- | --- | --- |
| API Gateway (Nginx) | Routing and Load Balancing | Nginx | 80 |
| User Service | Authentication and User Profiles Management | Node/Express, MongoDB | 4001 |
| Question Service | Question Repository and Fetching | Node/Express, MongoDB | 4002 |
| Matching Service | Queueing, Matchmaking, SSE/WebSockets | Node/Express, Redis | 4003 |
| Collaboration Service | Real-time Code Editing and Chatting | Node/Socket.io, Redis | 4004 |

# 3. Pre-requisites

You must have the following installed to run the project locally:

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (Required for all services and databases)
- `node 22.19.0 (LTS)`
- `pnpm` (Package manager for monorepo workspaces)

# 4. Installation and Setup [Local Development]

## 4.1 Clone Repository

```bash
git clone https://github.com/CS3219-AY2526Sem1/cs3219-ay2526s1-project-g05.git peerprep
```

All commands below assume you are in the **root folder `/`**

## 4.2 Install Dependencies

```bash
cd frontend
pnpm install

cd backend
pnpm -r install
```

## 4.3 Setup Docker Containers

This command will set up the foundational database containers (MongoDB and Redis).

```bash
docker-compose -f docker-compose-local.yml up -d
```

## 4.4 Create `.env` for backend

```bash
cd backend
cp .env.example .env
```

- Remember to edit the `OPENAI_API_KEY` variable to use AI features

## 4.5 Start the Frontend and Backend

```bash
cd frontend
pnpm run dev

cd backend
pnpm run dev
```

## 4.6 Seed Data

- This seeds dummy data and creates a test account that you can try out!

```bash
cd backend/db_management
pnpm run seed
```

## 4.7 Test it out!

- The site is now available at [http://localhost:5173](http://localhost:5173)

  - You can try it out with this test seed account:

  - ```
    email: test1@mail.com
    password: Testing123!
    ```

# 5. Production Deployment

## 5.1 Pre-requisites

- Docker Desktop/Docker Engine

## 5.2 Clone Repository

```bash
git clone https://github.com/CS3219-AY2526Sem1/cs3219-ay2526s1-project-g05.git peerprep
```

All commands below assume you are in the root `/` folder.

## 5.3 Copy `.env.prod` file for backend

```bash
cd backend
cp .env.prod.example .env.prod
```

- Remember to edit the `OPENAI_API_KEY` variable to use AI features

## 5.4 Build Containers and Run

```bash
docker-compose up -d --build --scale peerprep_user_service=2 --scale peerprep_question_service=2 --scale peerprep_code_execution_service=2
```

- This spawns 2 user_service, question_service and code_execution_service containers for load-balancing
  - matching_service currently does not support load-balancing

## 5.5 Seed the Database

```bash
cd backend/db_management
pnpm run seed:prod
```

## 5.6 Test Deployment!

- The site should now be available at [http://localhost:5173](http://localhost:5173)

# AI Use Summary

Tools Used: ChatGPT (GPT‑5 Thinking), GitHub Copilot

In general, AI tools were used to:

- Generate boilerplate code for backend Express server.
- Auto-complete functions the author was already programming.
- Debug programming errors as they came up.
- Suggest implementation approaches on how to incoporate different technolgies to the codebase.
