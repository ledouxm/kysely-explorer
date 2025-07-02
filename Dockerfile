# Use Node.js LTS version
FROM node:22-alpine

# Set working directory
WORKDIR /app

# Copy package.json files for dependency installation
COPY package.json ./
COPY packages/frontend/package.json ./packages/frontend/
COPY packages/backend/package.json ./packages/backend/

# Install dependencies using npm instead of pnpm to avoid permission issues
WORKDIR /app/packages/frontend
RUN npm install

WORKDIR /app/packages/backend  
RUN npm install

# Copy source code
WORKDIR /app
COPY packages/ ./packages/
COPY .env* ./

# Build frontend first
WORKDIR /app/packages/frontend
RUN npm run build

# Switch to backend directory
WORKDIR /app/packages/backend

# Set environment variable to point to frontend dist folder
ENV FRONTEND_FOLDER=/app/packages/frontend/dist

# Expose the port
EXPOSE 3005

# Start the backend server
CMD ["npm", "run", "dev"]
