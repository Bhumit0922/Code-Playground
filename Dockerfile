# Production Dockerfile for Code Playground
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Install build dependencies, Python, C/C++ compilers, and OpenJDK for local code execution
RUN apk update && apk add --no-cache \
    python3 \
    py3-pip \
    g++ \
    gcc \
    openjdk17 \
    make

# Copy package files
COPY package*.json ./

# Install npm dependencies
RUN npm ci --only=production || npm install --production

# Copy application files
COPY . .

# Set environment variables
ENV NODE_ENV=production
ENV PORT=4000
ENV EXECUTION_MODE=cloud

# Expose server port
EXPOSE 4000

# Start server
CMD ["node", "backend/index.js"]
