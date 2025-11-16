FROM node:22.19-bullseye-slim

WORKDIR /app

# We build all services from the root /backend as the context
COPY ./common_scripts common_scripts
COPY ./services/code_execution_service/package.json services/code_execution_service/package.json
COPY ./services/code_execution_service/src services/code_execution_service/src
COPY ./services/code_execution_service/index.js services/code_execution_service/index.js
COPY ./package.json .
COPY ./pnpm-lock.yaml .
COPY ./pnpm-workspace.yaml .
COPY ./.env.prod .

# Install pnpm
RUN npm install -g pnpm@10.17.1

# Install dependencies for all workspaces (only 1 workspace in this case)
RUN pnpm -r install --prod --frozen-lockfile

WORKDIR /app/services/code_execution_service

CMD ["pnpm", "run", "start"]
