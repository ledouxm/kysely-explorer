# Use Node.js LTS version
FROM node:22-alpine

# Install pnpm globally
RUN npm install -g pnpm

# Set working directory
WORKDIR /app

# Copy package.json files for dependency installation
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/frontend/package.json ./packages/frontend/
COPY packages/backend/package.json ./packages/backend/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code (excluding node_modules)
COPY packages/ ./packages/
COPY docker-compose.yaml ./
COPY .env* ./

# Build frontend first
WORKDIR /app/packages/frontend
RUN pnpm run build

# Switch to backend directory and build
WORKDIR /app/packages/backend

# Set environment variable to point to frontend dist folder
ENV FRONTEND_FOLDER=/app/packages/frontend/dist

# Build backend (if there's a build script, otherwise this step can be skipped for dev)
RUN pnpm run build

# Expose the port (adjust based on your backend port)
EXPOSE 3005

# Start the backend server
CMD ["pnpm", "run", "dev"]
