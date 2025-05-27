# Build stage
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY .npmrc ./

# Install dependencies with debug output
RUN npm ci --loglevel verbose

# Copy the rest of the application
COPY . .

# Build the application with debug output
ENV NEXT_TELEMETRY_DISABLED 1
ENV NODE_ENV production
ENV NEXT_DEBUG 1
ENV NODE_OPTIONS="--max-old-space-size=4096"

# Try to build with more detailed output
RUN echo "Starting build process..." && \
    echo "Node version:" && node -v && \
    echo "NPM version:" && npm -v && \
    echo "Current directory contents:" && ls -la && \
    echo "Running build..." && \
    NODE_ENV=production npm run build 2>&1 | tee build.log && \
    echo "Build completed. Contents of .next:" && \
    ls -la .next

# Production stage
FROM node:18-alpine AS runner

WORKDIR /app

# Copy necessary files from builder
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# Set environment variables
ENV NODE_ENV production
ENV PORT 3000
ENV NEXT_PUBLIC_API_URL https://listless-backend-production.up.railway.app

# Expose the port
EXPOSE 3000

# Start the application
CMD ["node", "server.js"] 