FROM node:22.19-bookworm-slim
# We unfortunately can't use slim as argon2 needs glibc

WORKDIR /app

# We build all services from the root /backend as the context
COPY ./common_scripts common_scripts
COPY ./services/user_service/package.json services/user_service/package.json
COPY ./services/user_service/src services/user_service/src
COPY ./services/user_service/index.js services/user_service/index.js
COPY ./package.json .
COPY ./pnpm-lock.yaml .
COPY ./pnpm-workspace.yaml .
COPY ./.env.prod .

# Install pnpm
RUN npm install -g pnpm@10.17.1 

# Install dependemcoes for all workspaces (only 1 workspace in this case)
RUN pnpm -r install --prod --frozen-lockfile

WORKDIR /app/services/user_service

CMD ["pnpm", "run", "start"]
