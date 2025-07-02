FROM node:22-alpine AS with-pnpm
RUN npm install -g pnpm

FROM with-pnpm AS deps

RUN apk add --no-cache python3 make g++

WORKDIR /app

COPY .npmrc ./
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/frontend/package.json ./packages/frontend/
COPY packages/backend/package.json ./packages/backend/
COPY packages/frontend/panda.config.ts ./packages/frontend/
COPY packages/frontend/src/theme.ts ./packages/frontend/src/

RUN pnpm install --frozen-lockfile

FROM deps AS builder
WORKDIR /app

COPY ./packages/frontend ./packages/frontend
RUN pnpm frontend build

FROM with-pnpm AS runner
WORKDIR /app

COPY --from=builder /app/packages/frontend/dist ./packages/frontend/dist
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/package.json ./package.json
COPY --from=deps /app/pnpm-lock.yaml ./pnpm-lock.yaml
COPY --from=deps /app/packages/backend/ ./packages/backend
COPY ./packages/backend ./packages/backend
COPY .npmrc ./


RUN mkdir -p /app/data && \
    chown -R node:node /app/data

ENV FRONTEND_FOLDER=/app/packages/frontend/dist
ENV AUTH_DB_PATH=/app/data/auth.db
ENV USER_FILES_DIRECTORY=/app/data/user_files



USER node


CMD ["pnpm", "backend", "start"]