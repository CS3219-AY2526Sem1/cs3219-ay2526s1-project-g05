# Stage 1 - Build the frontend
FROM node:22.19-bullseye AS builder

WORKDIR /app
COPY ./pnpm-lock.yaml ./
COPY ./pnpm-workspace.yaml ./
COPY ./package.json ./

# Install pnpm
RUN npm install -g pnpm@10.17.1 

RUN pnpm install --frozen-lockfile --prod=false
COPY . .
RUN pnpm run build --mode production

# Stage 2 - Run Nginx container
# Pull the latest (stable) nginx base image
FROM nginx:1.29.3-trixie
# Set working directory to nginx resources directory
# (this is also the default directory for an nginx container as opposed to /var/www/html)
WORKDIR /usr/share/nginx/html
# Remove default nginx static resources
RUN rm -rf ./*
# Copies static resources from builder stage
COPY --from=builder /app/dist .
COPY nginx_configs/nginx.conf /etc/nginx/conf.d/default.conf
COPY nginx_configs/proxy_params /etc/nginx/proxy_params

CMD ["nginx", "-g", "daemon off;"]