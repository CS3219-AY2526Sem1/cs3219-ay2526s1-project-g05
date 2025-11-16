FROM node:22.19-bullseye-slim

WORKDIR /app

# We build all services from the root /backend as the context
COPY ./common_scripts common_scripts
COPY ./services/question_service/package.json services/question_service/package.json
COPY ./services/question_service/src services/question_service/src
COPY ./package.json .
COPY ./pnpm-lock.yaml .
COPY ./pnpm-workspace.yaml .
COPY ./.env.prod .

# Install pnpm
RUN npm install -g pnpm@10.17.1 

# Install dependemcoes for all workspaces (only 1 workspace in this case)
RUN pnpm -r install --prod --frozen-lockfile

WORKDIR /app/services/question_service

CMD ["pnpm", "run", "start"]
